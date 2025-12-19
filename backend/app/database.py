from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    database = None

db = Database()

async def get_database():
    return db.database

async def connect_to_mongo():
    """Create database connection"""
    try:
        db.client = AsyncIOMotorClient(settings.MONGODB_URL)
        db.database = db.client[settings.DATABASE_NAME]
        
        # Create indexes for better performance
        await create_indexes()
        
        logger.info("Connected to MongoDB")
    except Exception as e:
        logger.error(f"Could not connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    """Close database connection"""
    if db.client:
        db.client.close()
        logger.info("Disconnected from MongoDB")

async def create_indexes():
    """Create database indexes for better performance"""
    try:
        # Users collection indexes
        await db.database.users.create_index("email", unique=True)
        await db.database.users.create_index("student_id", unique=True, sparse=True)
        
        # Classrooms collection indexes
        await db.database.classrooms.create_index("name")
        await db.database.classrooms.create_index("admin_id")
        await db.database.classrooms.create_index("members")
        
        # Rooms collection indexes
        await db.database.rooms.create_index("classroom_id")
        await db.database.rooms.create_index([("classroom_id", 1), ("name", 1)], unique=True)
        
        # Messages collection indexes
        await db.database.messages.create_index("room_id")
        await db.database.messages.create_index("sender_id")
        await db.database.messages.create_index("timestamp")
        await db.database.messages.create_index([("room_id", 1), ("timestamp", 1)])
        
        # Friend requests collection indexes
        await db.database.friend_requests.create_index([("sender_id", 1), ("receiver_id", 1)], unique=True)
        await db.database.friend_requests.create_index("receiver_id")
        await db.database.friend_requests.create_index("sender_id")
        
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")

