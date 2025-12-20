from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from datetime import datetime, timedelta
from typing import Optional
from app.models import (
    UserCreate, User, UserInDB, Token, EmailVerification,
    UserUpdate, TokenData
)
from app.auth import (
    verify_password, get_password_hash, create_access_token,
    create_refresh_token, verify_token, get_current_user,
    get_current_active_user, generate_verification_code
)
from app.database import get_database
from app.email_service import email_service
from app.config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["authentication"])

# Store verification codes temporarily (in production, use Redis)
verification_codes = {}

@router.post("/register", response_model=dict)
async def register(user_data: UserCreate, db = Depends(get_database)):
    """Register a new user with email verification"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if student_id is already taken (if provided)
    if user_data.student_id:
        existing_student = await db.users.find_one({"student_id": user_data.student_id})
        if existing_student:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student ID already registered"
            )
    
    # Generate verification code
    verification_code = generate_verification_code()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Store verification code
    verification_codes[user_data.email] = {
        "code": verification_code,
        "expires_at": expires_at,
        "user_data": user_data.dict()
    }
    
    # Send verification email
    email_sent = await email_service.send_verification_email(user_data.email, verification_code)
    
    if not email_sent:
        logger.warning(f"Failed to send verification email to {user_data.email}")
    
    return {
        "message": "Verification code sent to your email",
        "email": user_data.email
    }

from pydantic import BaseModel

class EmailVerificationRequest(BaseModel):
    email: str
    code: str

@router.post("/verify-email", response_model=dict)
async def verify_email(verification_data: EmailVerificationRequest, db = Depends(get_database)):
    """Verify email with code and create user account"""
    logger.info(f"Verifying email for {verification_data.email} with code {verification_data.code}")
    email = verification_data.email
    code = verification_data.code
    
    # Check if verification code exists and is valid
    if email not in verification_codes:
        logger.warning(f"No verification code found for {email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )
    
    stored_data = verification_codes[email]
    logger.info(f"Found stored data for {email}: {stored_data}")
    
    # Check if code matches and hasn't expired
    if (stored_data["code"] != code or 
        stored_data["expires_at"] < datetime.utcnow()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )
    
    # Get user data
    user_data = UserCreate(**stored_data["user_data"])
    
    # Create user in database
    hashed_password = get_password_hash(user_data.password)
    user_dict = user_data.dict()
    del user_dict["password"]
    
    # Remove empty student_id to prevent unique index issues
    if "student_id" in user_dict and (not user_dict["student_id"] or user_dict["student_id"].strip() == ""):
        del user_dict["student_id"]
    
    user_dict.update({
        "hashed_password": hashed_password,
        "is_verified": True,
        "friends": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })
    
    result = await db.users.insert_one(user_dict)
    user_id = result.inserted_id
    
    # Remove verification code
    del verification_codes[email]
    
    # Send welcome email
    await email_service.send_welcome_email(user_data.email, user_data.name)
    
    # Create tokens
    access_token = create_access_token(data={"sub": user_data.email})
    refresh_token = create_refresh_token(data={"sub": user_data.email})
    
    return {
        "message": "Email verified successfully",
        "user": {
            "id": str(user_id),
            "email": user_data.email,
            "name": user_data.name,
            "is_verified": True
        },
        "tokens": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    }

from pydantic import BaseModel

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login", response_model=Token)
async def login(request: LoginRequest, db = Depends(get_database)):
    """Login with email and password"""
    # Find user
    user = await db.users.find_one({"email": request.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Verify password
    if not verify_password(request.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user is verified
    if not user.get("is_verified", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please verify your email before logging in"
        )
    
    # Create tokens
    access_token = create_access_token(data={"sub": user["email"]})
    refresh_token = create_refresh_token(data={"sub": user["email"]})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=Token)
async def refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPAuthorizationCredentials),
    db = Depends(get_database)
):
    """Refresh access token using refresh token"""
    token_data = verify_token(credentials.credentials, token_type="refresh")
    
    # Find user
    user = await db.users.find_one({"email": token_data.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Create new tokens
    access_token = create_access_token(data={"sub": user["email"]})
    refresh_token = create_refresh_token(data={"sub": user["email"]})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=User)
async def get_current_user_info(current_user: UserInDB = Depends(get_current_active_user)):
    """Get current user information"""
    return User(**current_user.dict())

@router.put("/me", response_model=User)
async def update_current_user(
    user_update: UserUpdate,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Update current user profile"""
    # Prepare update data
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    # Update user in database
    from bson import ObjectId
    user_id = ObjectId(str(current_user.id)) if not isinstance(current_user.id, ObjectId) else current_user.id
    
    result = await db.users.update_one(
        {"_id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        # Try with string ID as fallback
        result = await db.users.update_one(
            {"_id": str(current_user.id)},
            {"$set": update_data}
        )
    
    # Get updated user
    updated_user = await db.users.find_one({"_id": user_id})
    if not updated_user:
        # Try with string ID as fallback
        updated_user = await db.users.find_one({"_id": str(current_user.id)})
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found after update"
        )
    
    return User(**updated_user)

@router.post("/logout")
async def logout():
    """Logout user (client should remove tokens)"""
    return {"message": "Successfully logged out"}

@router.post("/resend-verification")
async def resend_verification(email: str, db = Depends(get_database)):
    """Resend verification code"""
    # Check if user exists and is not verified
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.get("is_verified", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    # Generate new verification code
    verification_code = generate_verification_code()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Store verification code
    verification_codes[email] = {
        "code": verification_code,
        "expires_at": expires_at,
        "user_data": None  # User already exists, just need to verify
    }
    
    # Send verification email
    email_sent = await email_service.send_verification_email(email, verification_code)
    
    if not email_sent:
        logger.warning(f"Failed to send verification email to {email}")
    
    return {"message": "Verification code resent to your email"}

@router.get("/user/{user_id}")
async def get_user_by_id(
    user_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get user information by ID (for messaging purposes)"""
    try:
        from bson import ObjectId
        
        # Try to find user
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            user = await db.users.find_one({"_id": user_id})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check if user is a teacher and get teacher profile
        teacher_profile = None
        if user.get("role") == "teacher":
            teacher_profile = await db.teacher_profiles.find_one({"user_id": ObjectId(user_id)})
        
        # Return user info (use teacher profile info if available)
        return {
            "id": str(user["_id"]),
            "_id": str(user["_id"]),
            "name": teacher_profile.get("full_name") if teacher_profile else user.get("name", ""),
            "full_name": teacher_profile.get("full_name") if teacher_profile else user.get("name", ""),
            "email": user.get("email", ""),
            "avatar": teacher_profile.get("profile_picture") if teacher_profile else user.get("avatar", ""),
            "role": user.get("role", "student")
        }
        
    except Exception as e:
        logger.error(f"Error getting user by ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user information"
        )

