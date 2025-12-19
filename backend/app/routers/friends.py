from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.models import User, UserInDB, FriendRequest, FriendRequestStatus
from app.auth import get_current_active_user
from app.database import get_database
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/friends", tags=["friends"])

@router.get("/", response_model=List[User])
async def get_friends(
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get current user's friends list"""
    # Get friends details
    friends = []
    for friend_id in current_user.friends:
        friend = await db.users.find_one({"_id": friend_id})
        if friend:
            friends.append(User(**friend))
    
    return friends

@router.post("/send-request/{receiver_id}")
async def send_friend_request(
    receiver_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Send a friend request to another user"""
    try:
        receiver_object_id = ObjectId(receiver_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )
    
    # Check if receiver exists
    receiver = await db.users.find_one({"_id": receiver_object_id})
    if not receiver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if trying to send request to self
    if receiver_object_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send friend request to yourself"
        )
    
    # Check if already friends
    if receiver_object_id in current_user.friends:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already friends with this user"
        )
    
    # Check if request already exists
    existing_request = await db.friend_requests.find_one({
        "sender_id": current_user.id,
        "receiver_id": receiver_object_id
    })
    
    if existing_request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Friend request already sent"
        )
    
    # Check if there's a pending request from receiver
    reverse_request = await db.friend_requests.find_one({
        "sender_id": receiver_object_id,
        "receiver_id": current_user.id,
        "status": FriendRequestStatus.PENDING
    })
    
    if reverse_request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This user has already sent you a friend request"
        )
    
    # Create friend request
    friend_request = FriendRequest(
        sender_id=current_user.id,
        receiver_id=receiver_object_id,
        status=FriendRequestStatus.PENDING
    )
    
    try:
        await db.friend_requests.insert_one(friend_request.dict())
    except Exception as e:
        if "duplicate key error" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Friend request already exists"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send friend request"
            )
    
    return {"message": "Friend request sent successfully"}

@router.get("/requests", response_model=List[dict])
async def get_friend_requests(
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get pending friend requests (received)"""
    # Get pending requests where current user is receiver
    # Try both ObjectId and string formats to handle different ID types
    from bson import ObjectId
    user_id_obj = ObjectId(str(current_user.id)) if not isinstance(current_user.id, ObjectId) else current_user.id
    user_id_str = str(current_user.id)
    
    requests = await db.friend_requests.find({
        "$or": [
            {"receiver_id": user_id_obj},
            {"receiver_id": user_id_str}
        ],
        "status": FriendRequestStatus.PENDING
    }).to_list(length=100)
    
    # Get sender details for each request
    result = []
    for request in requests:
        # Handle different ID types for sender lookup
        sender_id = request["sender_id"]
        sender_obj = ObjectId(str(sender_id)) if not isinstance(sender_id, ObjectId) else sender_id
        sender_str = str(sender_id)
        
        # Try both ObjectId and string formats
        sender = await db.users.find_one({"_id": sender_obj})
        if not sender:
            sender = await db.users.find_one({"_id": sender_str})
            
        if sender:
            # Ensure sender has an 'id' field for frontend
            sender_dict = dict(sender)
            if 'id' not in sender_dict:
                sender_dict['id'] = str(sender_dict['_id'])
            
            result.append({
                "request_id": str(request["_id"]),
                "sender": User(**sender_dict),
                "created_at": request["created_at"]
            })
    
    return result

@router.post("/accept-request/{request_id}")
async def accept_friend_request(
    request_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Accept a friend request"""
    try:
        request_object_id = ObjectId(request_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request ID"
        )
    
    # Find the friend request
    user_id_obj = ObjectId(str(current_user.id)) if not isinstance(current_user.id, ObjectId) else current_user.id
    user_id_str = str(current_user.id)
    
    friend_request = await db.friend_requests.find_one({
        "_id": request_object_id,
        "$or": [
            {"receiver_id": user_id_obj},
            {"receiver_id": user_id_str}
        ],
        "status": FriendRequestStatus.PENDING
    })
    
    if not friend_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend request not found"
        )
    
    sender_id = friend_request["sender_id"]
    
    # Update friend request status
    await db.friend_requests.update_one(
        {"_id": request_object_id},
        {"$set": {"status": FriendRequestStatus.ACCEPTED}}
    )
    
    # Add to friends list for both users
    # Handle different ID types for both users
    current_user_obj = ObjectId(str(current_user.id)) if not isinstance(current_user.id, ObjectId) else current_user.id
    sender_obj = ObjectId(str(sender_id)) if not isinstance(sender_id, ObjectId) else sender_id
    
    # Try updating with ObjectId first, then string as fallback
    result1 = await db.users.update_one(
        {"_id": current_user_obj},
        {"$addToSet": {"friends": sender_obj}}
    )
    if result1.matched_count == 0:
        await db.users.update_one(
            {"_id": str(current_user.id)},
            {"$addToSet": {"friends": str(sender_id)}}
        )
    
    result2 = await db.users.update_one(
        {"_id": sender_obj},
        {"$addToSet": {"friends": current_user_obj}}
    )
    if result2.matched_count == 0:
        await db.users.update_one(
            {"_id": str(sender_id)},
            {"$addToSet": {"friends": str(current_user.id)}}
        )
    
    return {"message": "Friend request accepted successfully"}

@router.post("/decline-request/{request_id}")
async def decline_friend_request(
    request_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Decline a friend request"""
    try:
        request_object_id = ObjectId(request_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request ID"
        )
    
    # Find the friend request
    user_id_obj = ObjectId(str(current_user.id)) if not isinstance(current_user.id, ObjectId) else current_user.id
    user_id_str = str(current_user.id)
    
    friend_request = await db.friend_requests.find_one({
        "_id": request_object_id,
        "$or": [
            {"receiver_id": user_id_obj},
            {"receiver_id": user_id_str}
        ],
        "status": FriendRequestStatus.PENDING
    })
    
    if not friend_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend request not found"
        )
    
    # Update friend request status
    await db.friend_requests.update_one(
        {"_id": request_object_id},
        {"$set": {"status": FriendRequestStatus.DECLINED}}
    )
    
    return {"message": "Friend request declined"}

@router.delete("/remove/{friend_id}")
async def remove_friend(
    friend_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Remove a friend"""
    try:
        friend_object_id = ObjectId(friend_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )
    
    # Handle different ID types for friend lookup
    friend_str = str(friend_object_id)
    friend = await db.users.find_one({"_id": friend_object_id})
    if not friend:
        friend = await db.users.find_one({"_id": friend_str})
    
    if not friend:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Handle different ID types for current user
    current_user_obj = ObjectId(str(current_user.id)) if not isinstance(current_user.id, ObjectId) else current_user.id
    current_user_str = str(current_user.id)
    
    # Check if they are friends (check both ID formats)
    current_friends = current_user.friends or []
    is_friend = (friend_object_id in current_friends or 
                friend_str in current_friends or 
                str(friend_object_id) in [str(f) for f in current_friends])
    
    if not is_friend:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not friends with this user"
        )
    
    # Remove from friends list for both users (handle both ID types)
    # Remove from current user's friends list
    await db.users.update_one(
        {"_id": current_user_obj},
        {"$pull": {"friends": {"$in": [friend_object_id, friend_str]}}}
    )
    await db.users.update_one(
        {"_id": current_user_str},
        {"$pull": {"friends": {"$in": [friend_object_id, friend_str]}}}
    )
    
    # Remove from friend's friends list
    await db.users.update_one(
        {"_id": friend_object_id},
        {"$pull": {"friends": {"$in": [current_user_obj, current_user_str]}}}
    )
    await db.users.update_one(
        {"_id": friend_str},
        {"$pull": {"friends": {"$in": [current_user_obj, current_user_str]}}}
    )
    
    # Also remove any friend requests between these users
    await db.friend_requests.delete_many({
        "$or": [
            {"sender_id": {"$in": [current_user_obj, current_user_str]}, 
             "receiver_id": {"$in": [friend_object_id, friend_str]}},
            {"sender_id": {"$in": [friend_object_id, friend_str]}, 
             "receiver_id": {"$in": [current_user_obj, current_user_str]}}
        ]
    })
    
    # Update any existing friend requests to declined
    await db.friend_requests.update_many(
        {
            "$or": [
                {"sender_id": current_user.id, "receiver_id": friend_object_id},
                {"sender_id": friend_object_id, "receiver_id": current_user.id}
            ]
        },
        {"$set": {"status": FriendRequestStatus.DECLINED}}
    )
    
    return {"message": "Friend removed successfully"}

@router.get("/search/{query}")
async def search_users(
    query: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Search for users by name or email"""
    if len(query) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query must be at least 2 characters long"
        )
    
    # Search users by name or email (case insensitive)
    users = await db.users.find({
        "_id": {"$ne": current_user.id},  # Exclude current user
        "$or": [
            {"name": {"$regex": query, "$options": "i"}},
            {"email": {"$regex": query, "$options": "i"}},
            {"student_id": {"$regex": query, "$options": "i"}}
        ]
    }).limit(20).to_list(length=20)
    
    result = []
    for user in users:
        user_obj = User(**user)
        # Check if already friends
        is_friend = user["_id"] in current_user.friends
        
        # Check if there's a pending request
        pending_request = await db.friend_requests.find_one({
            "$or": [
                {"sender_id": current_user.id, "receiver_id": user["_id"]},
                {"sender_id": user["_id"], "receiver_id": current_user.id}
            ],
            "status": FriendRequestStatus.PENDING
        })
        
        # Ensure user has proper ID field
        user_dict = user_obj.dict()
        user_dict['id'] = str(user['_id'])  # Ensure ID is properly set
        
        result.append({
            "user": user_dict,
            "is_friend": is_friend,
            "has_pending_request": pending_request is not None,
            "request_sent_by_me": pending_request["sender_id"] == current_user.id if pending_request else False
        })
    
    return result

