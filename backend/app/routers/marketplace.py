"""
Marketplace API Routes for Notes Trading
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime
from app.models import (
    MarketplaceNote, MarketplaceNoteCreate, MarketplaceNoteUpdate,
    NoteReview, NoteReviewCreate, NotePurchase, UserWallet,
    UserInDB, NoteCategory, NoteStatus
)
from app.auth import get_current_active_user
from app.database import get_database
from bson import ObjectId
import logging
import os
import shutil

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/marketplace", tags=["marketplace"])

# Upload directory
UPLOAD_DIR = "static/uploads/marketplace"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/notes", response_model=MarketplaceNote)
async def create_note(
    title: str = Form(...),
    description: str = Form(...),
    category: NoteCategory = Form(...),
    subject: str = Form(...),
    price: int = Form(...),
    is_free: bool = Form(False),
    tags: str = Form(""),
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Upload a new note to the marketplace"""
    try:
        # Validate file type
        if not file.filename.endswith(('.pdf', '.docx', '.doc', '.pptx', '.txt')):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF, DOCX, DOC, PPTX, and TXT files are allowed"
            )
        
        # Save file
        file_path = os.path.join(UPLOAD_DIR, f"{ObjectId()}_{file.filename}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get file size
        file_size = os.path.getsize(file_path)
        
        # Parse tags
        tags_list = [tag.strip() for tag in tags.split(',') if tag.strip()] if tags else []
        
        # Create note document
        note_dict = {
            "seller_id": ObjectId(current_user.id),
            "seller_name": current_user.name,
            "title": title,
            "description": description,
            "category": category,
            "subject": subject,
            "file_url": file_path,
            "file_name": file.filename,
            "file_size": file_size,
            "price": price if not is_free else 0,
            "is_free": is_free,
            "status": NoteStatus.APPROVED,  # Auto-approve for now
            "downloads": 0,
            "views": 0,
            "rating": 0.0,
            "total_reviews": 0,
            "tags": tags_list,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.marketplace_notes.insert_one(note_dict)
        note_dict["_id"] = str(result.inserted_id)
        note_dict["seller_id"] = str(note_dict["seller_id"])
        
        logger.info(f"Note created: {title} by {current_user.name}")
        return MarketplaceNote(**note_dict)
        
    except Exception as e:
        logger.error(f"Error creating note: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create note: {str(e)}"
        )

@router.get("/notes")
async def get_notes(
    category: Optional[NoteCategory] = None,
    search: Optional[str] = None,
    sort_by: str = "recent",  # recent, popular, price_low, price_high, rating
    is_free: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0,
    db = Depends(get_database)
):
    """Get all marketplace notes with filters"""
    try:
        query = {"status": NoteStatus.APPROVED}
        
        if category and category != NoteCategory.ALL_SUBJECTS:
            query["category"] = category
        
        if is_free is not None:
            query["is_free"] = is_free
        
        if search:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"subject": {"$regex": search, "$options": "i"}},
                {"tags": {"$in": [search]}}
            ]
        
        # Determine sort order
        sort_field = "created_at"
        sort_direction = -1
        
        if sort_by == "popular":
            sort_field = "downloads"
        elif sort_by == "price_low":
            sort_field = "price"
            sort_direction = 1
        elif sort_by == "price_high":
            sort_field = "price"
        elif sort_by == "rating":
            sort_field = "rating"
        
        notes = await db.marketplace_notes.find(query).sort(
            sort_field, sort_direction
        ).skip(offset).limit(limit).to_list(length=limit)
        
        # Convert ObjectIds to strings and map _id to id
        for note in notes:
            note["id"] = str(note.pop("_id"))
            note["seller_id"] = str(note["seller_id"])
        
        return [MarketplaceNote(**note).model_dump(by_alias=False) for note in notes]
        
    except Exception as e:
        logger.error(f"Error fetching notes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch notes"
        )

@router.get("/notes/{note_id}")
async def get_note(
    note_id: str,
    db = Depends(get_database)
):
    """Get a specific note by ID"""
    try:
        note = await db.marketplace_notes.find_one({"_id": ObjectId(note_id)})
        
        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note not found"
            )
        
        # Increment views
        await db.marketplace_notes.update_one(
            {"_id": ObjectId(note_id)},
            {"$inc": {"views": 1}}
        )
        note["views"] += 1
        
        note["id"] = str(note.pop("_id"))
        note["seller_id"] = str(note["seller_id"])
        
        return MarketplaceNote(**note).model_dump(by_alias=False)
        
    except Exception as e:
        logger.error(f"Error fetching note: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch note"
        )

@router.get("/notes/user/my-notes")
async def get_my_notes(
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get current user's uploaded notes"""
    try:
        notes = await db.marketplace_notes.find(
            {"seller_id": ObjectId(current_user.id)}
        ).sort("created_at", -1).to_list(length=100)
        
        for note in notes:
            note["id"] = str(note.pop("_id"))
            note["seller_id"] = str(note["seller_id"])
        
        return [MarketplaceNote(**note).model_dump(by_alias=False) for note in notes]
        
    except Exception as e:
        logger.error(f"Error fetching my notes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch notes"
        )

@router.post("/notes/{note_id}/purchase")
async def purchase_note(
    note_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Purchase a note using credits"""
    try:
        # Get note
        note = await db.marketplace_notes.find_one({"_id": ObjectId(note_id)})
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        # Check if already purchased
        existing_purchase = await db.note_purchases.find_one({
            "note_id": ObjectId(note_id),
            "buyer_id": ObjectId(current_user.id)
        })
        
        if existing_purchase:
            return {"message": "Already purchased", "can_download": True}
        
        # Get/create buyer wallet
        buyer_wallet = await db.wallets.find_one({"user_id": ObjectId(current_user.id)})
        if not buyer_wallet:
            buyer_wallet = {
                "user_id": ObjectId(current_user.id),
                "balance": 100,
                "total_earned": 0,
                "total_spent": 0,
                "transactions": []
            }
            await db.wallets.insert_one(buyer_wallet)
        
        price = note["price"]
        
        # Check if free or sufficient balance
        if not note["is_free"]:
            if buyer_wallet["balance"] < price:
                raise HTTPException(
                    status_code=400,
                    detail="Insufficient credits"
                )
            
            # Deduct from buyer
            await db.wallets.update_one(
                {"user_id": ObjectId(current_user.id)},
                {
                    "$inc": {"balance": -price, "total_spent": price},
                    "$push": {
                        "transactions": {
                            "type": "purchase",
                            "amount": -price,
                            "note_id": str(note_id),
                            "timestamp": datetime.utcnow()
                        }
                    }
                }
            )
            
            # Add to seller
            await db.wallets.update_one(
                {"user_id": note["seller_id"]},
                {
                    "$inc": {"balance": price, "total_earned": price},
                    "$push": {
                        "transactions": {
                            "type": "sale",
                            "amount": price,
                            "note_id": str(note_id),
                            "timestamp": datetime.utcnow()
                        }
                    }
                },
                upsert=True
            )
        
        # Record purchase
        purchase = {
            "note_id": ObjectId(note_id),
            "buyer_id": ObjectId(current_user.id),
            "seller_id": note["seller_id"],
            "price": price,
            "purchased_at": datetime.utcnow()
        }
        await db.note_purchases.insert_one(purchase)
        
        # Increment downloads
        await db.marketplace_notes.update_one(
            {"_id": ObjectId(note_id)},
            {"$inc": {"downloads": 1}}
        )
        
        return {"message": "Purchase successful", "can_download": True}
        
    except Exception as e:
        logger.error(f"Error purchasing note: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/notes/{note_id}/reviews", response_model=List[NoteReview])
async def get_note_reviews(
    note_id: str,
    db = Depends(get_database)
):
    """Get reviews for a note"""
    try:
        reviews = await db.note_reviews.find(
            {"note_id": ObjectId(note_id)}
        ).sort("created_at", -1).to_list(length=100)
        
        for review in reviews:
            review["_id"] = str(review["_id"])
            review["note_id"] = str(review["note_id"])
            review["buyer_id"] = str(review["buyer_id"])
        
        return [NoteReview(**review) for review in reviews]
        
    except Exception as e:
        logger.error(f"Error fetching reviews: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch reviews")

@router.post("/notes/{note_id}/reviews", response_model=NoteReview)
async def create_review(
    note_id: str,
    review_data: NoteReviewCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Create a review for a purchased note"""
    try:
        # Check if purchased
        purchase = await db.note_purchases.find_one({
            "note_id": ObjectId(note_id),
            "buyer_id": ObjectId(current_user.id)
        })
        
        if not purchase:
            raise HTTPException(status_code=400, detail="Must purchase before reviewing")
        
        # Check if already reviewed
        existing = await db.note_reviews.find_one({
            "note_id": ObjectId(note_id),
            "buyer_id": ObjectId(current_user.id)
        })
        
        if existing:
            raise HTTPException(status_code=400, detail="Already reviewed")
        
        # Create review
        review = {
            "note_id": ObjectId(note_id),
            "buyer_id": ObjectId(current_user.id),
            "buyer_name": current_user.name,
            "rating": review_data.rating,
            "comment": review_data.comment,
            "created_at": datetime.utcnow()
        }
        
        result = await db.note_reviews.insert_one(review)
        
        # Update note rating
        reviews = await db.note_reviews.find({"note_id": ObjectId(note_id)}).to_list(length=1000)
        avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
        
        await db.marketplace_notes.update_one(
            {"_id": ObjectId(note_id)},
            {
                "$set": {"rating": round(avg_rating, 2), "total_reviews": len(reviews)}
            }
        )
        
        review["_id"] = str(result.inserted_id)
        review["note_id"] = str(review["note_id"])
        review["buyer_id"] = str(review["buyer_id"])
        
        return NoteReview(**review)
        
    except Exception as e:
        logger.error(f"Error creating review: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/wallet", response_model=UserWallet)
async def get_wallet(
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get user's wallet"""
    try:
        wallet = await db.wallets.find_one({"user_id": ObjectId(current_user.id)})
        
        if not wallet:
            # Create wallet with starting balance
            wallet = {
                "user_id": ObjectId(current_user.id),
                "balance": 100,
                "total_earned": 0,
                "total_spent": 0,
                "transactions": [],
                "updated_at": datetime.utcnow()
            }
            result = await db.wallets.insert_one(wallet)
            wallet["_id"] = str(result.inserted_id)
        else:
            wallet["_id"] = str(wallet["_id"])
        
        wallet["user_id"] = str(wallet["user_id"])
        
        return UserWallet(**wallet)
        
    except Exception as e:
        logger.error(f"Error fetching wallet: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch wallet")

@router.get("/leaderboard")
async def get_leaderboard(
    limit: int = 10,
    db = Depends(get_database)
):
    """Get top sellers leaderboard"""
    try:
        pipeline = [
            {"$match": {"status": NoteStatus.APPROVED}},
            {"$group": {
                "_id": "$seller_id",
                "seller_name": {"$first": "$seller_name"},
                "total_downloads": {"$sum": "$downloads"},
                "total_notes": {"$sum": 1},
                "avg_rating": {"$avg": "$rating"}
            }},
            {"$sort": {"total_downloads": -1}},
            {"$limit": limit}
        ]
        
        leaderboard = await db.marketplace_notes.aggregate(pipeline).to_list(length=limit)
        
        # Get earnings for each seller
        for seller in leaderboard:
            wallet = await db.wallets.find_one({"user_id": seller["_id"]})
            seller["total_earned"] = wallet["total_earned"] if wallet else 0
            seller["seller_id"] = str(seller.pop("_id"))
        
        return leaderboard
        
    except Exception as e:
        logger.error(f"Error fetching leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch leaderboard")

@router.get("/purchases/my-purchases", response_model=List[MarketplaceNote])
async def get_my_purchases(
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get user's purchased notes"""
    try:
        purchases = await db.note_purchases.find(
            {"buyer_id": ObjectId(current_user.id)}
        ).to_list(length=100)
        
        note_ids = [p["note_id"] for p in purchases]
        
        notes = await db.marketplace_notes.find(
            {"_id": {"$in": note_ids}}
        ).to_list(length=100)
        
        for note in notes:
            note["_id"] = str(note["_id"])
            note["seller_id"] = str(note["seller_id"])
        
        return [MarketplaceNote(**note) for note in notes]
        
    except Exception as e:
        logger.error(f"Error fetching purchases: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch purchases")

@router.get("/notes/{note_id}/download")
async def download_note(
    note_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Download a purchased note"""
    from fastapi.responses import FileResponse
    
    try:
        # Get note
        note = await db.marketplace_notes.find_one({"_id": ObjectId(note_id)})
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        # Check if user owns it or it's free
        if not note["is_free"]:
            purchase = await db.note_purchases.find_one({
                "note_id": ObjectId(note_id),
                "buyer_id": ObjectId(current_user.id)
            })
            
            if not purchase:
                raise HTTPException(
                    status_code=403,
                    detail="You must purchase this note first"
                )
        
        # Get file path
        file_path = note["file_url"]
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found on server")
        
        # Return file
        return FileResponse(
            path=file_path,
            filename=note["file_name"],
            media_type='application/octet-stream'
        )
        
    except Exception as e:
        logger.error(f"Error downloading note: {e}")
        raise HTTPException(status_code=500, detail=str(e))
