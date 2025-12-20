from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
import os
import shutil
from pathlib import Path

from app.auth import get_current_active_user
from app.database import get_database
from app.models import UserInDB, DirectMessage, Conversation, MessageType
from app.ai_service import ai_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/messages", tags=["messages"])

@router.get("/conversations", response_model=List[dict])
async def get_conversations(
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get all conversations for the current user"""
    try:
        # Handle different ID types
        user_id_obj = ObjectId(str(current_user.id)) if not isinstance(current_user.id, ObjectId) else current_user.id
        user_id_str = str(current_user.id)
        
        conversations = await db.conversations.find({
            "participants": {"$in": [user_id_obj, user_id_str]}
        }).sort("updated_at", -1).to_list(length=100)
        
        result = []
        for conv in conversations:
            # Get the other participant
            participants = conv["participants"]
            other_participant_id = None
            for p_id in participants:
                if str(p_id) != user_id_str:
                    other_participant_id = p_id
                    break
            
            if other_participant_id:
                # Get other user details
                other_user = await db.users.find_one({"_id": ObjectId(str(other_participant_id))})
                if not other_user:
                    other_user = await db.users.find_one({"_id": str(other_participant_id)})
                
                if other_user:
                    # Get unread message count
                    unread_count = await db.direct_messages.count_documents({
                        "conversation_id": str(conv["_id"]),
                        "receiver_id": {"$in": [user_id_obj, user_id_str]},
                        "is_read": False
                    })
                    
                    result.append({
                        "id": str(conv["_id"]),
                        "other_user": {
                            "id": str(other_user["_id"]),
                            "username": other_user.get("username", ""),
                            "full_name": other_user.get("full_name", ""),
                            "avatar": other_user.get("avatar", "")
                        },
                        "last_message_content": conv.get("last_message_content", ""),
                        "last_message_timestamp": conv.get("last_message_timestamp"),
                        "unread_count": unread_count,
                        "updated_at": conv.get("updated_at")
                    })
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting conversations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get conversations"
        )

@router.post("/conversations/{friend_id}")
async def create_or_get_conversation(
    friend_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Create a new conversation or get existing one with a friend"""
    try:
        friend_obj_id = ObjectId(friend_id)
        user_id_obj = ObjectId(str(current_user.id)) if not isinstance(current_user.id, ObjectId) else current_user.id
        user_id_str = str(current_user.id)
        friend_id_str = str(friend_id)
        
        # Check if conversation already exists
        existing_conv = await db.conversations.find_one({
            "$or": [
                {"participants": {"$all": [user_id_obj, friend_obj_id]}},
                {"participants": {"$all": [user_id_str, friend_id_str]}},
                {"participants": {"$all": [user_id_obj, friend_id_str]}},
                {"participants": {"$all": [user_id_str, friend_obj_id]}}
            ]
        })
        
        if existing_conv:
            return {"conversation_id": str(existing_conv["_id"])}
        
        # Create new conversation
        conversation = Conversation(
            participants=[user_id_str, friend_id_str],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        result = await db.conversations.insert_one(conversation.dict(exclude={"id"}))
        
        return {"conversation_id": str(result.inserted_id)}
        
    except Exception as e:
        logger.error(f"Error creating conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create conversation"
        )

@router.get("/conversations/{conversation_id}/messages", response_model=List[dict])
async def get_messages(
    conversation_id: str,
    limit: int = 50,
    offset: int = 0,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get messages from a conversation"""
    try:
        # Verify user is part of this conversation
        conversation = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        user_id_str = str(current_user.id)
        if user_id_str not in [str(p) for p in conversation["participants"]]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get messages
        messages = await db.direct_messages.find({
            "conversation_id": conversation_id
        }).sort("timestamp", -1).skip(offset).limit(limit).to_list(length=limit)
        
        # Mark messages as read
        await db.direct_messages.update_many(
            {
                "conversation_id": conversation_id,
                "receiver_id": {"$in": [current_user.id, user_id_str]},
                "is_read": False
            },
            {"$set": {"is_read": True}}
        )
        
        # Format messages for response
        result = []
        logger.info(f"Processing {len(messages)} messages")
        for msg in reversed(messages):  # Reverse to show chronological order
            logger.info(f"Processing message: {msg}")
            # Get sender details
            sender = await db.users.find_one({"_id": ObjectId(str(msg["sender_id"]))})
            if not sender:
                sender = await db.users.find_one({"_id": str(msg["sender_id"])})
            
            message_data = {
                "id": str(msg["_id"]),
                "content": msg["content"],
                "message_type": msg["message_type"],
                "file_url": msg.get("file_url"),
                "file_name": msg.get("file_name"),
                "file_size": msg.get("file_size"),
                "is_ai_response": msg.get("is_ai_response", False),
                "timestamp": msg["timestamp"],
                "is_read": msg["is_read"],
                "sender": {
                    "id": str(sender["_id"]) if sender else msg["sender_id"],
                    "username": sender.get("username", "") if sender else "Unknown",
                    "full_name": sender.get("full_name", "") if sender else "Unknown",
                    "avatar": sender.get("avatar", "") if sender else ""
                },
                "is_own_message": str(msg["sender_id"]) == user_id_str
            }
            logger.info(f"Formatted message data: {message_data}")
            result.append(message_data)
        
        logger.info(f"Returning {len(result)} formatted messages")
        return result
        
    except Exception as e:
        logger.error(f"Error getting messages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get messages"
        )

@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    content: Optional[str] = Form(None),
    message_type: MessageType = Form(MessageType.TEXT),
    file: Optional[UploadFile] = File(None),
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Send a message in a conversation"""
    try:
        # Verify conversation exists and user is participant
        conversation = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        user_id_str = str(current_user.id)
        participants = [str(p) for p in conversation["participants"]]
        if user_id_str not in participants:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get receiver ID
        receiver_id = None
        for p_id in participants:
            if p_id != user_id_str:
                receiver_id = p_id
                break
        
        if not receiver_id:
            raise HTTPException(status_code=400, detail="Invalid conversation")
        
        # Handle file upload
        file_url = None
        file_name = None
        file_size = None
        
        if file and file.filename:
            # Create uploads directory if it doesn't exist
            upload_dir = Path("static/uploads/messages")
            upload_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate unique filename
            file_extension = Path(file.filename).suffix
            unique_filename = f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
            file_path = upload_dir / unique_filename
            
            # Save file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            file_url = f"/static/uploads/messages/{unique_filename}"
            file_name = file.filename
            file_size = file_path.stat().st_size
            
            # Determine message type based on file type
            if file.content_type:
                if file.content_type.startswith('image/'):
                    message_type = MessageType.IMAGE
                elif file.content_type.startswith('video/'):
                    message_type = MessageType.VIDEO
                elif file.content_type.startswith('audio/'):
                    message_type = MessageType.AUDIO
                else:
                    message_type = MessageType.FILE

        # Validate: either content or file must be present
        if not content and not file:
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message must have content or a file"
            )

        # Create message
        # Ensure content is string for DB model
        content_for_db = content or ""
        
        message = DirectMessage(
            conversation_id=conversation_id,
            sender_id=user_id_str,
            receiver_id=receiver_id,
            content=content_for_db,
            message_type=message_type,
            file_url=file_url,
            file_name=file_name,
            file_size=file_size,
            timestamp=datetime.utcnow()
        )
        
        # Insert message
        message_dict = message.dict(exclude={"id"})
        logger.info(f"Inserting message: {message_dict}")
        result = await db.direct_messages.insert_one(message_dict)
        message_id = str(result.inserted_id)
        logger.info(f"Message inserted with ID: {message_id}")
        
        # Update conversation
        await db.conversations.update_one(
            {"_id": ObjectId(conversation_id)},
            {
                "$set": {
                    "last_message_id": message_id,
                    "last_message_content": (content if content else (f"Sent a {message_type.value}" if file else "Message"))[:100],
                    "last_message_timestamp": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Check for AI mention
        ai_response_id = None
        if content and "@AI" in content.upper():
            try:
                # Get recent conversation context
                recent_messages = await db.direct_messages.find({
                    "conversation_id": conversation_id
                }).sort("timestamp", -1).limit(10).to_list(length=10)
                
                context = []
                for msg in reversed(recent_messages):
                    context.append({
                        "content": msg["content"],
                        "is_ai_response": msg.get("is_ai_response", False)
                    })
                
                # Generate AI response
                ai_response = await ai_service.respond_to_ai_mention(content, context)
                
                # Create AI response message
                ai_message = DirectMessage(
                    conversation_id=conversation_id,
                    sender_id="AI",  # Special sender ID for AI
                    receiver_id=user_id_str,
                    content=ai_response,
                    message_type=MessageType.AI_RESPONSE,
                    is_ai_response=True,
                    timestamp=datetime.utcnow()
                )
                
                ai_result = await db.direct_messages.insert_one(ai_message.dict(exclude={"id"}))
                ai_response_id = str(ai_result.inserted_id)
                
                # Update conversation with AI response
                await db.conversations.update_one(
                    {"_id": ObjectId(conversation_id)},
                    {
                        "$set": {
                            "last_message_id": ai_response_id,
                            "last_message_content": ai_response[:100],
                            "last_message_timestamp": datetime.utcnow(),
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
            except Exception as ai_error:
                logger.error(f"Error generating AI response: {ai_error}")
        
        return {
            "message_id": message_id,
            "ai_response_id": ai_response_id,
            "message": "Message sent successfully"
        }
        
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message"
        )

@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Delete a message"""
    try:
        message = await db.direct_messages.find_one({"_id": ObjectId(message_id)})
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        # Check if user owns the message
        if str(message["sender_id"]) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Delete the message
        await db.direct_messages.delete_one({"_id": ObjectId(message_id)})
        
        return {"message": "Message deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete message"
        )
