from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
import os
import shutil
from pathlib import Path

from app.auth import get_current_active_user
from app.database import get_database
from app.models import (
    UserInDB, UserRole, TeacherProfile, TeacherProfileCreate, TeacherProfileUpdate,
    TeacherReview, TeacherReviewCreate, HireRequest, HireRequestCreate, HireRequestUpdate,
    TeachingSession, HireRequestStatus, SessionType, TeacherStatus
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/teachers", tags=["teachers"])

# ============================================================================
# Teacher Profile Management
# ============================================================================

@router.post("/profile", response_model=dict)
async def create_teacher_profile(
    profile_data: TeacherProfileCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Create a teacher profile for the current user"""
    try:
        # Check if user is a teacher
        if current_user.role != UserRole.TEACHER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only users with teacher role can create teacher profiles"
            )
        
        user_id_obj = ObjectId(str(current_user.id))
        
        # Check if profile already exists
        existing_profile = await db.teacher_profiles.find_one({"user_id": user_id_obj})
        if existing_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Teacher profile already exists"
            )
        
        # Create profile
        profile_dict = profile_data.model_dump()
        profile_dict["user_id"] = user_id_obj
        profile_dict["status"] = TeacherStatus.APPROVED  # Auto-approve for now
        profile_dict["average_rating"] = 0.0
        profile_dict["total_reviews"] = 0
        profile_dict["total_students"] = 0
        profile_dict["total_sessions"] = 0
        profile_dict["total_earnings"] = 0.0
        profile_dict["is_active"] = True
        profile_dict["created_at"] = datetime.utcnow()
        profile_dict["updated_at"] = datetime.utcnow()
        
        result = await db.teacher_profiles.insert_one(profile_dict)
        profile_dict["_id"] = result.inserted_id
        
        return {
            "message": "Teacher profile created successfully",
            "id": str(result.inserted_id),
            "status": "pending_approval"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating teacher profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create teacher profile"
        )

@router.get("/profile", response_model=dict)
async def get_my_teacher_profile(
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get the current user's teacher profile"""
    try:
        user_id_obj = ObjectId(str(current_user.id))
        
        profile = await db.teacher_profiles.find_one({"user_id": user_id_obj})
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher profile not found"
            )
        
        profile["id"] = str(profile.pop("_id"))
        profile["user_id"] = str(profile["user_id"])
        
        return profile
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting teacher profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get teacher profile"
        )

@router.put("/profile", response_model=dict)
async def update_teacher_profile(
    profile_update: TeacherProfileUpdate,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Update the current user's teacher profile"""
    try:
        user_id_obj = ObjectId(str(current_user.id))
        
        profile = await db.teacher_profiles.find_one({"user_id": user_id_obj})
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher profile not found"
            )
        
        # Update profile
        update_data = profile_update.model_dump(exclude_unset=True)
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            await db.teacher_profiles.update_one(
                {"user_id": user_id_obj},
                {"$set": update_data}
            )
        
        return {"message": "Teacher profile updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating teacher profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update teacher profile"
        )

@router.post("/profile/picture", response_model=dict)
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Upload teacher profile picture"""
    try:
        user_id_obj = ObjectId(str(current_user.id))
        
        # Validate file type
        allowed_extensions = {".jpg", ".jpeg", ".png", ".gif"}
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Only images are allowed."
            )
        
        # Create upload directory
        upload_dir = Path("static/uploads/teachers/profiles")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Save file
        file_path = upload_dir / f"{str(user_id_obj)}{file_ext}"
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Update profile
        file_url = f"/static/uploads/teachers/profiles/{file_path.name}"
        await db.teacher_profiles.update_one(
            {"user_id": user_id_obj},
            {"$set": {"profile_picture": file_url, "updated_at": datetime.utcnow()}}
        )
        
        return {"message": "Profile picture uploaded successfully", "file_url": file_url}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading profile picture: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload profile picture"
        )

# ============================================================================
# Teacher Discovery & Search
# ============================================================================

@router.get("/", response_model=List[dict])
async def get_all_teachers(
    subject: Optional[str] = None,
    expertise: Optional[str] = None,
    min_rating: Optional[float] = None,
    max_price: Optional[float] = None,
    language: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db = Depends(get_database)
):
    """Get all approved teachers with optional filters"""
    try:
        # Show all active teachers (including pending for testing)
        query = {"is_active": True}
        
        # Apply filters
        if subject:
            query["courses_offered"] = {"$in": [subject]}
        
        if expertise:
            query["areas_of_expertise"] = {"$in": [expertise]}
        
        if min_rating:
            query["average_rating"] = {"$gte": min_rating}
        
        if max_price:
            query["hourly_rate"] = {"$lte": max_price}
        
        if language:
            query["languages_spoken"] = {"$in": [language]}
        
        if search:
            query["$or"] = [
                {"full_name": {"$regex": search, "$options": "i"}},
                {"short_bio": {"$regex": search, "$options": "i"}},
                {"courses_offered": {"$regex": search, "$options": "i"}},
                {"areas_of_expertise": {"$regex": search, "$options": "i"}}
            ]
        
        teachers = await db.teacher_profiles.find(query).skip(skip).limit(limit).to_list(length=limit)
        
        result = []
        for teacher in teachers:
            # Get user info
            user = await db.users.find_one({"_id": teacher["user_id"]})
            
            teacher_data = {
                "id": str(teacher["_id"]),
                "user_id": str(teacher["user_id"]),
                "full_name": teacher.get("full_name", ""),
                "profile_picture": teacher.get("profile_picture"),
                "short_bio": teacher.get("short_bio", ""),
                "areas_of_expertise": teacher.get("areas_of_expertise", []),
                "courses_offered": teacher.get("courses_offered", []),
                "years_of_experience": teacher.get("years_of_experience", 0),
                "languages_spoken": teacher.get("languages_spoken", []),
                "hourly_rate": teacher.get("hourly_rate"),
                "average_rating": teacher.get("average_rating", 0.0),
                "total_reviews": teacher.get("total_reviews", 0),
                "total_students": teacher.get("total_students", 0),
                "email": user.get("email") if user else None
            }
            result.append(teacher_data)
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting teachers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get teachers"
        )

@router.get("/{teacher_id}", response_model=dict)
async def get_teacher_profile(
    teacher_id: str,
    db = Depends(get_database)
):
    """Get a specific teacher's profile"""
    try:
        teacher_obj_id = ObjectId(teacher_id)
        
        profile = await db.teacher_profiles.find_one({"_id": teacher_obj_id})
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher profile not found"
            )
        
        # Get user info
        user = await db.users.find_one({"_id": profile["user_id"]})
        
        # Get reviews
        reviews = await db.teacher_reviews.find({"teacher_id": teacher_obj_id}).sort("created_at", -1).limit(10).to_list(length=10)
        
        profile_data = {
            "id": str(profile["_id"]),
            "user_id": str(profile["user_id"]),
            "full_name": profile.get("full_name", ""),
            "profile_picture": profile.get("profile_picture"),
            "short_bio": profile.get("short_bio", ""),
            "areas_of_expertise": profile.get("areas_of_expertise", []),
            "courses_offered": profile.get("courses_offered", []),
            "academic_degrees": profile.get("academic_degrees", []),
            "certifications": profile.get("certifications", []),
            "years_of_experience": profile.get("years_of_experience", 0),
            "languages_spoken": profile.get("languages_spoken", []),
            "hourly_rate": profile.get("hourly_rate"),
            "package_pricing": profile.get("package_pricing"),
            "availability_schedule": profile.get("availability_schedule", {}),
            "online_tools": profile.get("online_tools", []),
            "portfolio_links": profile.get("portfolio_links", []),
            "average_rating": profile.get("average_rating", 0.0),
            "total_reviews": profile.get("total_reviews", 0),
            "total_students": profile.get("total_students", 0),
            "total_sessions": profile.get("total_sessions", 0),
            "status": profile.get("status"),
            "email": user.get("email") if user else None,
            "recent_reviews": [
                {
                    "id": str(r["_id"]),
                    "student_name": r.get("student_name", "Anonymous"),
                    "student_avatar": r.get("student_avatar"),
                    "rating": r.get("rating", 0),
                    "comment": r.get("comment", ""),
                    "created_at": r.get("created_at").isoformat() if r.get("created_at") else None
                }
                for r in reviews
            ]
        }
        
        return profile_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting teacher profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get teacher profile"
        )

# ============================================================================
# Teacher Reviews
# ============================================================================

@router.post("/{teacher_id}/reviews", response_model=dict)
async def create_teacher_review(
    teacher_id: str,
    review_data: TeacherReviewCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Create a review for a teacher"""
    try:
        teacher_obj_id = ObjectId(teacher_id)
        student_id_obj = ObjectId(str(current_user.id))
        
        # Check if teacher exists
        teacher = await db.teacher_profiles.find_one({"_id": teacher_obj_id})
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher not found"
            )
        
        # Check if student has had a session with this teacher (accepted or completed)
        session = await db.hire_requests.find_one({
            "teacher_id": teacher["user_id"],
            "student_id": student_id_obj,
            "status": {"$in": [HireRequestStatus.ACCEPTED, HireRequestStatus.COMPLETED]}
        })
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only review teachers after your session request is accepted"
            )
        
        # Check if already reviewed
        existing_review = await db.teacher_reviews.find_one({
            "teacher_id": teacher_obj_id,
            "student_id": student_id_obj
        })
        
        if existing_review:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already reviewed this teacher"
            )
        
        # Create review
        review_dict = {
            "teacher_id": teacher_obj_id,
            "student_id": student_id_obj,
            "student_name": current_user.name,
            "student_avatar": current_user.avatar,
            "rating": review_data.rating,
            "comment": review_data.comment,
            "created_at": datetime.utcnow()
        }
        
        result = await db.teacher_reviews.insert_one(review_dict)
        
        # Update teacher's average rating
        all_reviews = await db.teacher_reviews.find({"teacher_id": teacher_obj_id}).to_list(length=None)
        avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
        
        await db.teacher_profiles.update_one(
            {"_id": teacher_obj_id},
            {
                "$set": {
                    "average_rating": round(avg_rating, 2),
                    "total_reviews": len(all_reviews),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {
            "message": "Review created successfully",
            "id": str(result.inserted_id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating review: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create review"
        )

@router.get("/{teacher_id}/reviews", response_model=List[dict])
async def get_teacher_reviews(
    teacher_id: str,
    skip: int = 0,
    limit: int = 20,
    db = Depends(get_database)
):
    """Get all reviews for a teacher"""
    try:
        teacher_obj_id = ObjectId(teacher_id)
        
        reviews = await db.teacher_reviews.find({"teacher_id": teacher_obj_id}).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
        
        result = [
            {
                "id": str(r["_id"]),
                "student_name": r.get("student_name", "Anonymous"),
                "student_avatar": r.get("student_avatar"),
                "rating": r.get("rating", 0),
                "comment": r.get("comment", ""),
                "created_at": r.get("created_at").isoformat() if r.get("created_at") else None
            }
            for r in reviews
        ]
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting reviews: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get reviews"
        )

# ============================================================================
# Hiring & Sessions
# ============================================================================

@router.post("/hire", response_model=dict)
async def create_hire_request(
    hire_data: HireRequestCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Create a hire request to a teacher"""
    try:
        teacher_id_obj = ObjectId(hire_data.teacher_id)
        student_id_obj = ObjectId(str(current_user.id))
        
        # Get teacher profile
        teacher = await db.teacher_profiles.find_one({"_id": teacher_id_obj})
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher not found"
            )
        
        # Calculate price
        total_price = 0.0
        if hire_data.session_type == SessionType.HOURLY:
            total_price = teacher.get("hourly_rate", 0) * (hire_data.duration_hours or 1)
        elif hire_data.session_type == SessionType.MONTHLY:
            package_pricing = teacher.get("package_pricing", {})
            total_price = package_pricing.get("monthly", 0)
        
        # Create hire request
        hire_dict = {
            "teacher_id": teacher["user_id"],
            "student_id": student_id_obj,
            "session_type": hire_data.session_type,
            "subject": hire_data.subject,
            "description": hire_data.description,
            "proposed_schedule": hire_data.proposed_schedule,
            "duration_hours": hire_data.duration_hours,
            "start_time": datetime.fromisoformat(hire_data.start_time.replace('Z', '+00:00')) if hire_data.start_time else None,
            "end_time": datetime.fromisoformat(hire_data.end_time.replace('Z', '+00:00')) if hire_data.end_time else None,
            "total_price": total_price,
            "status": HireRequestStatus.PENDING,
            "payment_status": "pending",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.hire_requests.insert_one(hire_dict)
        
        return {
            "message": "Hire request sent successfully",
            "id": str(result.inserted_id),
            "total_price": total_price
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating hire request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create hire request"
        )

@router.get("/hire/requests/sent", response_model=List[dict])
async def get_sent_hire_requests(
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get hire requests sent by the current student"""
    try:
        student_id_obj = ObjectId(str(current_user.id))
        
        requests = await db.hire_requests.find({"student_id": student_id_obj}).sort("created_at", -1).to_list(length=100)
        
        result = []
        for req in requests:
            # Get teacher info
            teacher_user = await db.users.find_one({"_id": req["teacher_id"]})
            teacher_profile = await db.teacher_profiles.find_one({"user_id": req["teacher_id"]})
            
            # Check if student has reviewed this teacher
            has_review = False
            if teacher_profile:
                has_review = await db.teacher_reviews.find_one({
                    "teacher_id": teacher_profile["_id"],
                    "student_id": student_id_obj
                }) is not None
            
            result.append({
                "id": str(req["_id"]),
                "teacher": {
                    "id": str(teacher_profile["_id"]) if teacher_profile else None,
                    "name": teacher_profile.get("full_name") if teacher_profile else teacher_user.get("name"),
                    "profile_picture": teacher_profile.get("profile_picture") if teacher_profile else None
                },
                "session_type": req.get("session_type"),
                "subject": req.get("subject", ""),
                "description": req.get("description", ""),
                "start_time": req.get("start_time").isoformat() if req.get("start_time") else None,
                "end_time": req.get("end_time").isoformat() if req.get("end_time") else None,
                "total_price": req.get("total_price", 0),
                "status": req.get("status"),
                "payment_status": req.get("payment_status"),
                "created_at": req.get("created_at").isoformat() if req.get("created_at") else None,
                "has_review": has_review
            })
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting sent hire requests: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get hire requests"
        )

@router.get("/hire/requests/received", response_model=List[dict])
async def get_received_hire_requests(
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get hire requests received by the current teacher"""
    try:
        user_id_obj = ObjectId(str(current_user.id))
        
        # Check if user is a teacher
        if current_user.role != UserRole.TEACHER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only teachers can view received hire requests"
            )
        
        requests = await db.hire_requests.find({"teacher_id": user_id_obj}).sort("created_at", -1).to_list(length=100)
        
        result = []
        for req in requests:
            # Get student info
            student = await db.users.find_one({"_id": req["student_id"]})
            
            result.append({
                "id": str(req["_id"]),
                "student": {
                    "id": str(student["_id"]) if student else None,
                    "name": student.get("name") if student else "Unknown",
                    "avatar": student.get("avatar") if student else None,
                    "email": student.get("email") if student else None
                },
                "session_type": req.get("session_type"),
                "subject": req.get("subject", ""),
                "description": req.get("description", ""),
                "proposed_schedule": req.get("proposed_schedule"),
                "duration_hours": req.get("duration_hours"),
                "total_price": req.get("total_price", 0),
                "status": req.get("status"),
                "payment_status": req.get("payment_status"),
                "created_at": req.get("created_at").isoformat() if req.get("created_at") else None
            })
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting received hire requests: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get hire requests"
        )

@router.put("/hire/requests/{request_id}", response_model=dict)
async def update_hire_request(
    request_id: str,
    update_data: HireRequestUpdate,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Accept, reject, or update a hire request"""
    try:
        request_obj_id = ObjectId(request_id)
        user_id_obj = ObjectId(str(current_user.id))
        
        # Get the hire request
        hire_request = await db.hire_requests.find_one({"_id": request_obj_id})
        if not hire_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hire request not found"
            )
        
        # Check permissions
        if str(hire_request["teacher_id"]) != str(user_id_obj) and str(hire_request["student_id"]) != str(user_id_obj):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this request"
            )
        
        # Update request
        update_dict = update_data.model_dump(exclude_unset=True)
        if update_dict:
            update_dict["updated_at"] = datetime.utcnow()
            await db.hire_requests.update_one(
                {"_id": request_obj_id},
                {"$set": update_dict}
            )
            
            # If accepted, create a teaching session
            if update_dict.get("status") == HireRequestStatus.ACCEPTED:
                session_dict = {
                    "hire_request_id": request_obj_id,
                    "teacher_id": hire_request["teacher_id"],
                    "student_id": hire_request["student_id"],
                    "subject": hire_request["subject"],
                    "scheduled_time": update_data.proposed_schedule.get("start_time") if update_data.proposed_schedule else None,
                    "duration_minutes": (hire_request.get("duration_hours", 1) * 60),
                    "status": "scheduled",
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                await db.teaching_sessions.insert_one(session_dict)
                
                # Update teacher stats
                teacher_profile = await db.teacher_profiles.find_one({"user_id": hire_request["teacher_id"]})
                if teacher_profile:
                    await db.teacher_profiles.update_one(
                        {"user_id": hire_request["teacher_id"]},
                        {
                            "$inc": {"total_students": 1, "total_sessions": 1},
                            "$set": {"updated_at": datetime.utcnow()}
                        }
                    )
        
        return {"message": "Hire request updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating hire request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update hire request"
        )

@router.get("/sessions/my-sessions", response_model=List[dict])
async def get_my_sessions(
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get all sessions for the current user (teacher or student)"""
    try:
        user_id_obj = ObjectId(str(current_user.id))
        
        # Query based on user role
        query = {}
        if current_user.role == UserRole.TEACHER:
            query["teacher_id"] = user_id_obj
        else:
            query["student_id"] = user_id_obj
        
        sessions = await db.teaching_sessions.find(query).sort("scheduled_time", -1).to_list(length=100)
        
        result = []
        for session in sessions:
            # Get other party info
            if current_user.role == UserRole.TEACHER:
                other_user = await db.users.find_one({"_id": session["student_id"]})
                other_role = "student"
            else:
                other_user = await db.users.find_one({"_id": session["teacher_id"]})
                teacher_profile = await db.teacher_profiles.find_one({"user_id": session["teacher_id"]})
                other_role = "teacher"
            
            result.append({
                "id": str(session["_id"]),
                "subject": session.get("subject", ""),
                "scheduled_time": session.get("scheduled_time").isoformat() if session.get("scheduled_time") else None,
                "duration_minutes": session.get("duration_minutes", 60),
                "meeting_link": session.get("meeting_link"),
                "notes": session.get("notes"),
                "status": session.get("status"),
                "other_party": {
                    "id": str(other_user["_id"]) if other_user else None,
                    "name": teacher_profile.get("full_name") if other_role == "teacher" and teacher_profile else other_user.get("name") if other_user else "Unknown",
                    "avatar": teacher_profile.get("profile_picture") if other_role == "teacher" and teacher_profile else other_user.get("avatar") if other_user else None,
                    "role": other_role
                },
                "created_at": session.get("created_at").isoformat() if session.get("created_at") else None
            })
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting sessions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get sessions"
        )

@router.put("/sessions/{session_id}/complete", response_model=dict)
async def mark_session_complete(
    session_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Mark a session as complete (student can do this)"""
    try:
        session_obj_id = ObjectId(session_id)
        
        # This endpoint can accept either session_id from teaching_sessions
        # or hire_request_id directly if student wants to mark hire request as complete
        
        # First try to find it as a hire request ID
        hire_request = await db.hire_requests.find_one({"_id": session_obj_id})
        
        if hire_request:
            # Check if student owns this request
            if str(hire_request["student_id"]) != str(current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the student can mark their session as complete"
                )
            
            # Update status to completed
            await db.hire_requests.update_one(
                {"_id": session_obj_id},
                {
                    "$set": {
                        "status": HireRequestStatus.COMPLETED,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            return {"message": "Session marked as complete"}
        
        # If not found as hire request, try teaching_sessions
        session = await db.teaching_sessions.find_one({"_id": session_obj_id})
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Check if student owns this session
        if str(session["student_id"]) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the student can mark their session as complete"
            )
        
        # Update session status
        await db.teaching_sessions.update_one(
            {"_id": session_obj_id},
            {
                "$set": {
                    "status": "completed",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Also update the corresponding hire request
        if session.get("hire_request_id"):
            await db.hire_requests.update_one(
                {"_id": session["hire_request_id"]},
                {
                    "$set": {
                        "status": HireRequestStatus.COMPLETED,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
        
        return {"message": "Session marked as complete"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete session"
        )

# ============================================================================
# Teacher Dashboard Analytics
# ============================================================================

@router.get("/dashboard/analytics", response_model=dict)
async def get_teacher_analytics(
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get analytics data for teacher dashboard"""
    try:
        user_id_obj = ObjectId(str(current_user.id))
        
        # Check if user is a teacher
        if current_user.role != UserRole.TEACHER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only teachers can view analytics"
            )
        
        # Get teacher profile
        profile = await db.teacher_profiles.find_one({"user_id": user_id_obj})
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher profile not found"
            )
        
        # Get pending requests count
        pending_requests = await db.hire_requests.count_documents({
            "teacher_id": user_id_obj,
            "status": HireRequestStatus.PENDING
        })
        
        # Get active sessions count
        active_sessions = await db.teaching_sessions.count_documents({
            "teacher_id": user_id_obj,
            "status": {"$in": ["scheduled", "ongoing"]}
        })
        
        # Get recent messages count (unread)
        recent_messages = await db.direct_messages.count_documents({
            "receiver_id": user_id_obj,
            "is_read": False
        })
        
        return {
            "profile_views": 0,  # TODO: Implement profile view tracking
            "total_students": profile.get("total_students", 0),
            "total_sessions": profile.get("total_sessions", 0),
            "total_earnings": profile.get("total_earnings", 0.0),
            "average_rating": profile.get("average_rating", 0.0),
            "total_reviews": profile.get("total_reviews", 0),
            "pending_requests": pending_requests,
            "active_sessions": active_sessions,
            "unread_messages": recent_messages
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting teacher analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get analytics"
        )
