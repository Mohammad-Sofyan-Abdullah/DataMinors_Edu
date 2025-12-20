"""
YouTube Summarizer API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Optional
from datetime import datetime
from app.models import (
    YouTubeSession, YouTubeSessionCreate, YouTubeSessionUpdate, 
    YouTubeSessionInDB, YouTubeChatMessage, UserInDB, Flashcard
)
from app.auth import get_current_active_user
from app.database import get_database
from app.youtube_service import youtube_service
from app.export_service import export_service
from app.ai_service import ai_service
from bson import ObjectId
from fastapi.responses import StreamingResponse
import logging
import io

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/youtube", tags=["youtube"])

@router.post("/sessions", response_model=YouTubeSession)
async def create_youtube_session(
    session_data: YouTubeSessionCreate,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Create a new YouTube summarization session"""
    try:
        logger.info(f"Processing YouTube video: {session_data.video_url}")
        
        # Process the YouTube video with timeout
        import asyncio
        try:
            result = await asyncio.wait_for(
                youtube_service.process_youtube_video(session_data.video_url),
                timeout=300  # 5 minutes timeout
            )
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=status.HTTP_408_REQUEST_TIMEOUT,
                detail="Video processing timed out. Please try with a shorter video."
            )
        
        if "error" in result:
            logger.error(f"Video processing failed: {result['error']}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        # Validate result structure
        required_keys = ["video_info", "transcript", "short_summary", "detailed_summary"]
        missing_keys = [key for key in required_keys if key not in result]
        if missing_keys:
            logger.error(f"Video processing result missing keys: {missing_keys}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Video processing incomplete. Missing: {', '.join(missing_keys)}"
            )
        
        # Create session document
        session_dict = {
            "user_id": current_user.id,
            "video_url": session_data.video_url,
            "video_title": result["video_info"]["title"],
            "video_duration": result["video_info"]["duration"],
            "transcript": result["transcript"],
            "short_summary": result["short_summary"],
            "detailed_summary": result["detailed_summary"],
            "chat_history": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        logger.info(f"Creating session for video: {result['video_info']['title']}")
        
        # Insert into database
        result_db = await db.youtube_sessions.insert_one(session_dict)
        session_id = result_db.inserted_id
        
        # Return created session
        created_session = await db.youtube_sessions.find_one({"_id": session_id})
        return YouTubeSession(**created_session)
        
    except Exception as e:
        logger.error(f"Error creating YouTube session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process video: {str(e)}"
        )

@router.get("/sessions", response_model=List[YouTubeSession])
async def get_user_youtube_sessions(
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get all YouTube sessions for the current user"""
    try:
        logger.info(f"Fetching YouTube sessions for user: {current_user.id}")
        
        sessions = await db.youtube_sessions.find(
            {"user_id": current_user.id}
        ).sort("created_at", -1).to_list(length=100)
        
        logger.info(f"Found {len(sessions)} sessions")
        
        # Convert ObjectId to string for each session
        for session in sessions:
            session["_id"] = str(session["_id"])
            session["user_id"] = str(session["user_id"])
        
        result = [YouTubeSession(**session) for session in sessions]
        logger.info(f"Returning {len(result)} sessions")
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching YouTube sessions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch sessions"
        )

@router.get("/sessions/{session_id}", response_model=YouTubeSession)
async def get_youtube_session(
    session_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get a specific YouTube session"""
    try:
        logger.info(f"Fetching session {session_id} for user {current_user.id}")
        session_object_id = ObjectId(session_id)
    except Exception as e:
        logger.error(f"Invalid session ID {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session ID"
        )
    
    session = await db.youtube_sessions.find_one({
        "_id": session_object_id,
        "user_id": current_user.id
    })
    
    if not session:
        logger.warning(f"Session {session_id} not found for user {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Convert ObjectId to string
    session["_id"] = str(session["_id"])
    session["user_id"] = str(session["user_id"])
    
    logger.info(f"Session {session_id} found, returning details")
    return YouTubeSession(**session)

@router.post("/sessions/{session_id}/chat")
async def chat_with_transcript(
    session_id: str,
    question: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Ask a follow-up question about the video transcript"""
    try:
        session_object_id = ObjectId(session_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session ID"
        )
    
    # Get session
    session = await db.youtube_sessions.find_one({
        "_id": session_object_id,
        "user_id": current_user.id
    })
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if not session.get("transcript"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No transcript available for this session"
        )
    
    try:
        # Get answer from AI
        answer = await youtube_service.answer_question(
            question=question,
            transcript=session["transcript"],
            video_title=session["video_title"],
            chat_history=session.get("chat_history", [])
        )
        
        if not answer:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate answer"
            )
        
        # Create chat messages
        user_message = YouTubeChatMessage(role="user", content=question)
        assistant_message = YouTubeChatMessage(role="assistant", content=answer)
        
        # Update session with new chat messages
        await db.youtube_sessions.update_one(
            {"_id": session_object_id},
            {
                "$push": {
                    "chat_history": {
                        "$each": [user_message.dict(), assistant_message.dict()]
                    }
                },
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return {
            "question": question,
            "answer": answer,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process question: {str(e)}"
        )

@router.delete("/sessions/{session_id}")
async def delete_youtube_session(
    session_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Delete a YouTube session"""
    try:
        session_object_id = ObjectId(session_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session ID"
        )
    
    result = await db.youtube_sessions.delete_one({
        "_id": session_object_id,
        "user_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return {"message": "Session deleted successfully"}

@router.post("/sessions/{session_id}/regenerate-summaries")
async def regenerate_summaries(
    session_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Regenerate summaries for a session"""
    try:
        session_object_id = ObjectId(session_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session ID"
        )
    
    session = await db.youtube_sessions.find_one({
        "_id": session_object_id,
        "user_id": current_user.id
    })
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if not session.get("transcript"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No transcript available"
        )
    
    try:
        # Generate new summaries
        short_summary, detailed_summary = await youtube_service.generate_summaries(
            session["transcript"], session["video_title"]
        )
        
        if not short_summary or not detailed_summary:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to regenerate summaries"
            )
        
        # Update session
        await db.youtube_sessions.update_one(
            {"_id": session_object_id},
            {
                "$set": {
                    "short_summary": short_summary,
                    "detailed_summary": detailed_summary,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {
            "short_summary": short_summary,
            "detailed_summary": detailed_summary
        }
        
    except Exception as e:
        logger.error(f"Error regenerating summaries: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to regenerate summaries: {str(e)}"
        )

@router.get("/sessions/{session_id}/export/{format}")
async def export_session(
    session_id: str,
    format: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Export session in specified format (pdf, docx, markdown)"""
    if format not in ['pdf', 'docx', 'markdown']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format must be one of: pdf, docx, markdown"
        )
    
    try:
        session_object_id = ObjectId(session_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session ID"
        )
    
    session = await db.youtube_sessions.find_one({
        "_id": session_object_id,
        "user_id": current_user.id
    })
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    try:
        video_title = session.get('video_title', 'YouTube_Summary')
        safe_title = "".join(c for c in video_title if c.isalnum() or c in (' ', '-', '_')).rstrip()
        
        if format == 'markdown':
            content = export_service.export_to_markdown(session)
            filename = f"{safe_title}.md"
            media_type = "text/markdown"
            
            return StreamingResponse(
                io.BytesIO(content.encode()),
                media_type=media_type,
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
            
        elif format == 'docx':
            buffer = export_service.export_to_docx(session)
            filename = f"{safe_title}.docx"
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            
            return StreamingResponse(
                buffer,
                media_type=media_type,
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
            
        elif format == 'pdf':
            buffer = export_service.export_to_pdf(session)
            filename = f"{safe_title}.pdf"
            media_type = "application/pdf"
            
            return StreamingResponse(
                buffer,
                media_type=media_type,
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
    
    except Exception as e:
        logger.error(f"Error exporting session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export: {str(e)}"
        )

@router.post("/sessions/{session_id}/flashcards")
async def generate_flashcards(
    session_id: str,
    count: int = Body(10, embed=True),
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Generate flashcards for a YouTube session"""
    try:
        session_object_id = ObjectId(session_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session ID"
        )
    
    # Get session
    session = await db.youtube_sessions.find_one({
        "_id": session_object_id,
        "user_id": current_user.id
    })
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if not session.get("transcript"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No transcript available for this session"
        )
    
    if not session.get("short_summary") or not session.get("detailed_summary"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No summaries available for this session. Please regenerate summaries first."
        )
    
    try:
        # Generate flashcards using AI service
        # Let AI decide optimal count based on content quality (5-25 range)
        # Don't force a minimum - quality over quantity
        requested_count = min(count, 25) if count else 15
        flashcards_data = await ai_service.generate_flashcards(
            short_summary=session["short_summary"],
            detailed_summary=session["detailed_summary"],
            video_title=session["video_title"],
            count=requested_count
        )
        
        # Convert to Flashcard models
        flashcards = [Flashcard(**card) for card in flashcards_data]
        
        # Update session with flashcards
        await db.youtube_sessions.update_one(
            {"_id": session_object_id},
            {
                "$set": {
                    "flashcards": [card.dict() for card in flashcards],
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"Generated {len(flashcards)} flashcards for session {session_id}")
        
        return {
            "flashcards": flashcards,
            "count": len(flashcards)
        }
        
    except ValueError as e:
        # Handle specific flashcard generation errors
        logger.error(f"Flashcard generation failed: {e}")
        return {
            "flashcards": [],
            "count": 0,
            "message": "Flashcards not available right now. Please try again later or with a different video.",
            "error": str(e)
        }
        
    except Exception as e:
        logger.error(f"Unexpected error generating flashcards: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while generating flashcards"
        )

@router.post("/sessions/{session_id}/flashcards/explain")
async def explain_flashcard(
    session_id: str,
    question: str = Body(..., embed=True),
    answer: str = Body(..., embed=True),
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Get AI explanation for a specific flashcard"""
    try:
        session_object_id = ObjectId(session_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session ID"
        )
    
    # Get session
    session = await db.youtube_sessions.find_one({
        "_id": session_object_id,
        "user_id": current_user.id
    })
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if not session.get("transcript") and not session.get("detailed_summary"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No content available for this session"
        )
    
    try:
        # Use detailed summary as context if available, otherwise use transcript
        # Summary is preferred as it covers the whole video and extracts key concepts
        context = session.get("detailed_summary")
        if not context:
            # Fallback to transcript, truncated to fit context window
            # Llama 3 has 8k context, so ~20k chars is safe-ish, but let's stick to 15k
            context = session.get("transcript", "")[:15000]

        # Generate detailed explanation
        explanation = await ai_service.explain_flashcard_answer(
            question=question,
            answer=answer,
            context=context,
            video_title=session["video_title"]
        )
        
        return {
            "question": question,
            "answer": answer,
            "explanation": explanation
        }
        
    except Exception as e:
        logger.error(f"Error explaining flashcard: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate explanation: {str(e)}"
        )

@router.post("/sessions/{session_id}/related-videos")
async def generate_related_videos(
    session_id: str,
    count: int = Body(8, embed=True),
    current_user: UserInDB = Depends(get_current_active_user),
    db = Depends(get_database)
):
    """Generate related YouTube video suggestions for further study"""
    try:
        session_object_id = ObjectId(session_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session ID"
        )
    
    # Get session
    session = await db.youtube_sessions.find_one({
        "_id": session_object_id,
        "user_id": current_user.id
    })
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if not session.get("short_summary") or not session.get("detailed_summary"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No summaries available for this session. Please regenerate summaries first."
        )
    
    try:
        # Generate related videos using AI service
        requested_count = min(count, 10) if count else 8
        related_videos_data = await ai_service.generate_related_videos(
            short_summary=session["short_summary"],
            detailed_summary=session["detailed_summary"],
            video_title=session["video_title"],
            count=requested_count
        )
        
        # Update session with related videos
        await db.youtube_sessions.update_one(
            {"_id": session_object_id},
            {
                "$set": {
                    "related_videos": related_videos_data,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"Generated {len(related_videos_data)} related videos for session {session_id}")
        
        return {
            "related_videos": related_videos_data,
            "count": len(related_videos_data)
        }
        
    except ValueError as e:
        # Handle specific related videos generation errors
        logger.error(f"Related videos generation failed: {e}")
        return {
            "related_videos": [],
            "count": 0,
            "message": "Related videos not available right now. Please try again later.",
            "error": str(e)
        }
        
    except Exception as e:
        logger.error(f"Unexpected error generating related videos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while generating related videos"
        )

