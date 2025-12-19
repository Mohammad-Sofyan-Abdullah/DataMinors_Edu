from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from app.models import Message, MessageCreate, MessageUpdate, MessageInDB
from app.auth import get_current_active_user, verify_token
from app.database import get_database
from app.ai_service import ai_service
from app.models import UserInDB
from bson import ObjectId
from datetime import datetime
import json
import logging
from app.socketio_server import sio
from typing import Optional

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

# Socket.IO Event Handlers
@sio.event
async def authenticate(sid, *args):
    """No-op authenticate event; handshake auth is performed in connect."""
    session = await sio.get_session(sid)
    if session:
        await sio.emit('authenticated', {'status': 'success'}, room=sid)
        return True
    await sio.emit('error', {'error': 'Not authenticated'}, room=sid)
    return False

@sio.on('join_room')
async def handle_join_room(sid, room_id):
    """Handle room joining"""
    try:
        session = await sio.get_session(sid)
        if not session:
            await sio.emit('error', {'error': 'Unauthorized'}, room=sid)
            return

        db = await get_database()
        room = await db.rooms.find_one({"_id": ObjectId(room_id)})
        if not room:
            await sio.emit('error', {'error': 'Room not found'}, room=sid)
            return

        classroom = await db.classrooms.find_one({"_id": room["classroom_id"]})
        if not classroom or session['user_id'] not in classroom["members"]:
            await sio.emit('error', {'error': 'Access denied'}, room=sid)
            return

        sio.enter_room(sid, str(room_id))
        await sio.emit('room_joined', {
            'room_id': str(room_id),
            'user_name': session['name']
        }, room=sid)
        logger.info(f"Client {sid} joined room {room_id}")
    except Exception as e:
        logger.error(f"Error joining room: {e}")
        await sio.emit('error', {'error': str(e)}, room=sid)

@sio.on('leave_room')
async def handle_leave_room(sid, room_id):
    """Handle room leaving"""
    try:
        sio.leave_room(sid, str(room_id))
        session = await sio.get_session(sid)
        if session:
            await sio.emit('user_left', {
                'user_name': session['name']
            }, room=str(room_id))
        logger.info(f"Client {sid} left room {room_id}")
    except Exception as e:
        logger.error(f"Error leaving room: {e}")

@sio.on('send_message')
async def handle_message(sid, data):
    """Handle new message in a room"""
    try:
        room_id = data.get('room_id')
        content = data.get('content')
        
        if not all([room_id, content]):
            await sio.emit('error', {'error': 'Missing required fields'}, room=sid)
            return

        # Get user from session
        db = await get_database()
        user_data = await sio.get_session(sid)
        if not user_data:
            await sio.emit('error', {'error': 'Unauthorized'}, room=sid)
            return

        # Create and save message
        message_data = {
            'room_id': ObjectId(room_id),
            'content': content,
            'sender_id': user_data['user_id'],
            'timestamp': datetime.utcnow(),
            'edited': False,
            'deleted': False
        }
        
        result = await db.messages.insert_one(message_data)
        created_message = await db.messages.find_one({'_id': result.inserted_id})
        
        # Broadcast to room
        await sio.emit('new_message', {
            'message': {
                **created_message,
                '_id': str(created_message['_id']),
                'room_id': str(created_message['room_id'])
            },
            'sender_name': user_data.get('name'),
            'sender_avatar': user_data.get('avatar')
        }, room=str(room_id))
        
    except Exception as e:
        logger.error(f"Error handling message: {e}")
        await sio.emit('error', {'error': str(e)}, room=sid)

@router.get("/rooms/{room_id}/messages", response_model=List[Message])
async def get_room_messages(
    room_id: str,
    limit: int = 50,
    offset: int = 0,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get messages from a room"""
    try:
        room_object_id = ObjectId(room_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid room ID"
        )
    
    # Check if room exists
    room = await db.rooms.find_one({"_id": room_object_id})
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Check if user has access to this room
    classroom = await db.classrooms.find_one({"_id": room["classroom_id"]})
    if not classroom or current_user.id not in classroom["members"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this room"
        )
    
    # Get messages
    messages = await db.messages.find(
        {"room_id": room_object_id, "deleted": False}
    ).sort("timestamp", -1).skip(offset).limit(limit).to_list(length=limit)
    
    return [Message(**message) for message in reversed(messages)]

@router.post("/rooms/{room_id}/messages", response_model=Message)
async def send_message(
    room_id: str,
    message_data: MessageCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Send a message to a room"""
    try:
        room_object_id = ObjectId(room_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid room ID"
        )
    
    # Check if room exists
    room = await db.rooms.find_one({"_id": room_object_id})
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Check if user has access to this room
    classroom = await db.classrooms.find_one({"_id": room["classroom_id"]})
    if not classroom or current_user.id not in classroom["members"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this room"
        )
    
    # Moderate message content
    moderation_result = await ai_service.moderate_message(message_data.content)
    if not moderation_result.get("is_appropriate", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Message content inappropriate: {moderation_result.get('reason', 'Content not suitable')}"
        )
    
    # Create message
    message_dict = message_data.dict()
    message_dict.update({
        "sender_id": current_user.id,
        "timestamp": datetime.utcnow(),
        "edited": False,
        "deleted": False
    })
    
    result = await db.messages.insert_one(message_dict)
    message_id = result.inserted_id
    
    # Get created message with sender info
    created_message = await db.messages.find_one({"_id": message_id})
    message_obj = Message(**created_message)
    
    # Broadcast to Socket.IO room
    await sio.emit('new_message', {
        'message': {
            **message_obj.dict(),
            '_id': str(message_obj.id),
            'room_id': str(message_obj.room_id)
        },
        'sender_name': current_user.name,
        'sender_avatar': current_user.avatar
    }, room=str(room_id))
    
    return message_obj

@router.put("/messages/{message_id}", response_model=Message)
async def edit_message(
    message_id: str,
    message_update: MessageUpdate,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Edit a message (sender only)"""
    try:
        message_object_id = ObjectId(message_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid message ID"
        )
    
    # Find message
    message = await db.messages.find_one({"_id": message_object_id})
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Check if user is the sender
    if message["sender_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only edit your own messages"
        )
    
    # Check if message is deleted
    if message.get("deleted", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot edit deleted message"
        )
    
    # Moderate new content
    if message_update.content:
        moderation_result = await ai_service.moderate_message(message_update.content)
        if not moderation_result.get("is_appropriate", True):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Message content inappropriate: {moderation_result.get('reason', 'Content not suitable')}"
            )
    
    # Update message
    update_data = {k: v for k, v in message_update.dict().items() if v is not None}
    update_data.update({
        "edited": True,
        "edited_at": datetime.utcnow()
    })
    
    await db.messages.update_one(
        {"_id": message_object_id},
        {"$set": update_data}
    )
    
    # Get updated message
    updated_message = await db.messages.find_one({"_id": message_object_id})
    message_obj = Message(**updated_message)
    
    # Broadcast edit to Socket.IO room
    await sio.emit('message_edited', {
        'message': {
            **message_obj.dict(),
            '_id': str(message_obj.id),
            'room_id': str(message['room_id'])
        },
        'sender_name': current_user.name
    }, room=str(message["room_id"]))
    
    return message_obj

@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Delete a message (sender only)"""
    try:
        message_object_id = ObjectId(message_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid message ID"
        )
    
    # Find message
    message = await db.messages.find_one({"_id": message_object_id})
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Check if user is the sender
    if message["sender_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only delete your own messages"
        )
    
    # Check if message is already deleted
    if message.get("deleted", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message already deleted"
        )
    
    # Mark message as deleted
    await db.messages.update_one(
        {"_id": message_object_id},
        {"$set": {"deleted": True}}
    )
    
    # Broadcast deletion to Socket.IO room
    await sio.emit('message_deleted', {
        'message_id': str(message_object_id),
        'room_id': str(message['room_id'])
    }, room=str(message['room_id']))
    
    return {"message": "Message deleted successfully"}

@router.post("/rooms/{room_id}/summarize")
async def summarize_room_chat(
    room_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Generate AI summary of room chat"""
    try:
        room_object_id = ObjectId(room_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid room ID"
        )
    
    # Check if room exists
    room = await db.rooms.find_one({"_id": room_object_id})
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # Check if user has access to this room
    classroom = await db.classrooms.find_one({"_id": room["classroom_id"]})
    if not classroom or current_user.id not in classroom["members"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this room"
        )
    
    # Get recent messages (last 100)
    messages = await db.messages.find(
        {"room_id": room_object_id, "deleted": False}
    ).sort("timestamp", -1).limit(100).to_list(length=100)
    
    if not messages:
        return {"summary": "No messages to summarize in this room."}
    
    # Get sender names for messages
    message_data = []
    for msg in messages:
        sender = await db.users.find_one({"_id": msg["sender_id"]})
        message_data.append({
            "content": msg["content"],
            "sender_name": sender["name"] if sender else "Unknown",
            "timestamp": msg["timestamp"]
        })
    
    # Generate summary
    summary = await ai_service.summarize_chat(message_data, room["name"])
    
    return {"summary": summary}

# The raw WebSocket endpoint was removed in favor of Socket.IO event handlers above.



