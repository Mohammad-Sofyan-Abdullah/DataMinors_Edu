from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
from app.database import connect_to_mongo, close_mongo_connection
from app.routers import auth, friends, classrooms, chat, messages
from app.socketio_server import sio, asgi_app

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@sio.event
async def connect(sid, environ, auth):
    """Handle client connect with proper auth parameter."""
    logger.info(f"Client attempting to connect: {sid}")
    
    # Extract token from auth object
    token = None
    if isinstance(auth, dict):
        token = auth.get('token')
    
    if not token:
        logger.warning(f"No authentication token provided for {sid}")
        await sio.emit('error', {'error': 'Authentication required'}, room=sid)
        return False

    # Validate token and save user session
    try:
        from app.auth import verify_token
        from app.database import get_database

        token_data = verify_token(token)
        db = await get_database()
        user = await db.users.find_one({"email": token_data.email})
        if not user:
            logger.warning(f"Token valid but user not found: {token_data.email}")
            await sio.emit('error', {'error': 'User not found'}, room=sid)
            return False

        await sio.save_session(sid, {
            'user_id': str(user['_id']),
            'email': user['email'],
            'name': user.get('name'),
            'avatar': user.get('avatar')
        })
        logger.info(f"Authenticated socket for user {user['email']} (sid={sid})")
        await sio.emit('authenticated', {'status': 'success', 'user': user['name']}, room=sid)
        return True
    except Exception as e:
        logger.error(f"Socket auth failed for {sid}: {e}")
        await sio.emit('error', {'error': 'Authentication failed'}, room=sid)
        return False


@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up PeerLearn API...")
    await connect_to_mongo()
    yield
    # Shutdown
    logger.info("Shutting down PeerLearn API...")
    await close_mongo_connection()

app = FastAPI(
    title="PeerLearn API",
    description="Study companion platform for collaborative learning",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "ws://localhost:3000", "ws://127.0.0.1:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(friends.router)
app.include_router(classrooms.router)
app.include_router(chat.router)
app.include_router(messages.router)

# Import and include YouTube router
from app.routers import youtube
app.include_router(youtube.router)

# Import and include Marketplace router
from app.routers import marketplace
app.include_router(marketplace.router)

# Mount static files for message uploads
import os
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# Mount Socket.IO ASGI app
app.mount("/socket.io", asgi_app)

@app.get("/")
async def root():
    return {
        "message": "Welcome to PeerLearn API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "PeerLearn API"}

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(
#         "app.main:app",
#         host="0.0.0.0",
#         port=8000,
#         reload=True,
#         log_level="info"
#     )
# My name is Mohammad Sofyan Abdullah
# My Registration Number is: FA22-BDS-047

