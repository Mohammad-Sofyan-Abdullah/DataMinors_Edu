from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
from enum import Enum

from pydantic.json_schema import JsonSchemaValue
from pydantic_core import CoreSchema, core_schema
from typing import Any, Annotated

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, value):
        if not value:
            return None

        if isinstance(value, ObjectId):
            return str(value)

        if isinstance(value, str):
            try:
                if ObjectId.is_valid(value):
                    return str(value)  # Return the string directly, don't convert to ObjectId
            except Exception:
                raise ValueError("Invalid ObjectId format")

        raise ValueError("Invalid ObjectId format")

    @classmethod
    def __get_pydantic_core_schema__(
        cls,
        _source_type: Any,
        _handler: Any
    ) -> CoreSchema:
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.str_schema()
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x) if isinstance(x, ObjectId) else x,
                return_schema=core_schema.str_schema(),
            ),
        )

# User Role Enum
class UserRole(str, Enum):
    STUDENT = "student"
    TEACHER = "teacher"

# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    bio: Optional[str] = None
    avatar: Optional[str] = None
    study_interests: List[str] = []
    learning_streaks: int = 0
    student_id: Optional[str] = None
    role: UserRole = UserRole.STUDENT

class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.STUDENT

class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    study_interests: Optional[List[str]] = None
    learning_streaks: Optional[int] = None

class UserInDB(UserBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    hashed_password: str
    is_verified: bool = False
    friends: List[PyObjectId] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    role: UserRole = UserRole.STUDENT

    class Config:
        from_attributes = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat(),
        }
        populate_by_name = True
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class User(UserBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    is_verified: bool = False
    friends: List[PyObjectId] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    role: UserRole = UserRole.STUDENT

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Authentication Models
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    email: Optional[str] = None

class EmailVerification(BaseModel):
    email: EmailStr
    code: str
    expires_at: datetime

# Friend System Models
class FriendRequestStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"

class FriendRequest(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    sender_id: PyObjectId
    receiver_id: PyObjectId
    status: FriendRequestStatus = FriendRequestStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Classroom Models
class ClassroomBase(BaseModel):
    name: str
    description: Optional[str] = None
    logo: Optional[str] = None

class ClassroomCreate(ClassroomBase):
    pass

class ClassroomUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo: Optional[str] = None

class ClassroomInDB(ClassroomBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    admin_id: PyObjectId
    members: List[PyObjectId] = []
    invite_code: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Classroom(ClassroomBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    admin_id: PyObjectId
    members: List[PyObjectId] = []
    invite_code: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Room Models
class RoomBase(BaseModel):
    name: str
    description: Optional[str] = None

class RoomCreate(RoomBase):
    classroom_id: PyObjectId

class RoomUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class RoomInDB(RoomBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    classroom_id: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Room(RoomBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    classroom_id: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# YouTube Summarizer Models
class YouTubeChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class Flashcard(BaseModel):
    question: str
    answer: str
    explanation: Optional[str] = None

class FlashcardSet(BaseModel):
    flashcards: List[Flashcard]
    generated_at: datetime = Field(default_factory=datetime.utcnow)

class YouTubeSessionBase(BaseModel):
    video_url: str
    video_title: Optional[str] = None
    video_duration: Optional[int] = None  # in seconds
    transcript: Optional[str] = None
    short_summary: Optional[str] = None
    detailed_summary: Optional[str] = None
    chat_history: List[YouTubeChatMessage] = []
    flashcards: Optional[List[Flashcard]] = []
    slides_pdf_url: Optional[str] = None
    slides_status: Optional[str] = "pending" # pending, processing, completed, failed
    generated_slide_images: List[str] = [] # List of image URLs

class YouTubeSessionCreate(YouTubeSessionBase):
    pass

class YouTubeSessionUpdate(BaseModel):
    video_title: Optional[str] = None
    transcript: Optional[str] = None
    short_summary: Optional[str] = None
    detailed_summary: Optional[str] = None
    chat_history: Optional[List[YouTubeChatMessage]] = None

class YouTubeSessionInDB(YouTubeSessionBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class YouTubeSession(YouTubeSessionBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Message Models
class MessageBase(BaseModel):
    content: str
    room_id: PyObjectId

class MessageCreate(MessageBase):
    pass

class MessageUpdate(BaseModel):
    content: Optional[str] = None

class MessageInDB(MessageBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    sender_id: PyObjectId
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    edited: bool = False
    deleted: bool = False
    edited_at: Optional[datetime] = None

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Message(MessageBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    sender_id: PyObjectId
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    edited: bool = False
    deleted: bool = False
    edited_at: Optional[datetime] = None

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# WebSocket Models
class WebSocketMessage(BaseModel):
    type: str
    data: Dict[str, Any]

class ChatMessage(BaseModel):
    room_id: str
    content: str
    sender_id: str

# Direct messaging models
class MessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    FILE = "file"
    AI_RESPONSE = "ai_response"

class DirectMessage(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    conversation_id: str
    sender_id: str
    receiver_id: str
    content: str
    message_type: MessageType = MessageType.TEXT
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    is_ai_response: bool = False
    replied_to: Optional[str] = None  # ID of message being replied to
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    is_read: bool = False
    is_edited: bool = False
    edited_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class Conversation(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    participants: List[str]  # User IDs
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_message_id: Optional[str] = None
    last_message_content: Optional[str] = None
    last_message_timestamp: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# Marketplace Models
class NoteCategory(str, Enum):
    MATHEMATICS = "Mathematics"
    PHYSICS = "Physics"
    CHEMISTRY = "Chemistry"
    BIOLOGY = "Biology"
    COMPUTER_SCIENCE = "Computer Science"
    ENGINEERING = "Engineering"
    ALL_SUBJECTS = "All Subjects"
    OTHER = "Other"

class NoteStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class MarketplaceNote(BaseModel):
    id: Optional[PyObjectId] = Field(None, alias="_id")
    seller_id: PyObjectId
    seller_name: Optional[str] = None
    title: str
    description: str
    category: NoteCategory
    subject: str
    file_url: str
    file_name: str
    file_size: Optional[int] = None
    preview_url: Optional[str] = None
    price: int  # in credits
    is_free: bool = False
    status: NoteStatus = NoteStatus.PENDING
    downloads: int = 0
    views: int = 0
    rating: float = 0.0
    total_reviews: int = 0
    tags: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}

class MarketplaceNoteCreate(BaseModel):
    title: str
    description: str
    category: NoteCategory
    subject: str
    price: int
    is_free: bool = False
    tags: List[str] = []

class MarketplaceNoteUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[NoteCategory] = None
    subject: Optional[str] = None
    price: Optional[int] = None
    is_free: Optional[bool] = None
    tags: Optional[List[str]] = None

class NoteReview(BaseModel):
    id: Optional[PyObjectId] = Field(None, alias="_id")
    note_id: PyObjectId
    buyer_id: PyObjectId
    buyer_name: Optional[str] = None
    rating: int  # 1-5
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}

class NoteReviewCreate(BaseModel):
    rating: int
    comment: Optional[str] = None

class NotePurchase(BaseModel):
    id: Optional[PyObjectId] = Field(None, alias="_id")
    note_id: PyObjectId
    buyer_id: PyObjectId
    seller_id: PyObjectId
    price: int
    transaction_id: Optional[str] = None
    purchased_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}

class SellerChat(BaseModel):
    id: Optional[PyObjectId] = Field(None, alias="_id")
    note_id: PyObjectId
    buyer_id: PyObjectId
    seller_id: PyObjectId
    messages: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}

class UserWallet(BaseModel):
    id: Optional[PyObjectId] = Field(None, alias="_id")
    user_id: PyObjectId
    balance: int = 100  # Starting credits
    total_earned: int = 0
    total_spent: int = 0
    transactions: List[Dict[str, Any]] = []
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}
# Notes Models
class DocumentStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class Document(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    title: str
    content: str = ""
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    status: DocumentStatus = DocumentStatus.DRAFT
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}
        populate_by_name = True

class DocumentCreate(BaseModel):
    title: str
    content: str = ""

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    status: Optional[DocumentStatus] = None

class DocumentChatMessage(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    document_id: PyObjectId
    user_id: PyObjectId
    message: str
    response: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}
        populate_by_name = True

# Teacher Profile Models
class TeacherStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"

class PricingType(str, Enum):
    HOURLY = "hourly"
    PACKAGE = "package"
    COURSE = "course"

class TeacherProfileBase(BaseModel):
    full_name: str
    profile_picture: Optional[str] = None
    short_bio: Optional[str] = None
    areas_of_expertise: List[str] = []
    courses_offered: List[str] = []
    academic_degrees: List[str] = []
    certifications: List[str] = []
    years_of_experience: int = 0
    languages_spoken: List[str] = []
    hourly_rate: Optional[float] = None
    package_pricing: Optional[Dict[str, Any]] = None
    availability_schedule: Dict[str, Any] = {}
    online_tools: List[str] = []
    portfolio_links: List[str] = []

class TeacherProfileCreate(TeacherProfileBase):
    pass

class TeacherProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    profile_picture: Optional[str] = None
    short_bio: Optional[str] = None
    areas_of_expertise: Optional[List[str]] = None
    courses_offered: Optional[List[str]] = None
    academic_degrees: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    years_of_experience: Optional[int] = None
    languages_spoken: Optional[List[str]] = None
    hourly_rate: Optional[float] = None
    package_pricing: Optional[Dict[str, Any]] = None
    availability_schedule: Optional[Dict[str, Any]] = None
    online_tools: Optional[List[str]] = None
    portfolio_links: Optional[List[str]] = None

class TeacherProfile(TeacherProfileBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    status: TeacherStatus = TeacherStatus.PENDING
    average_rating: float = 0.0
    total_reviews: int = 0
    total_students: int = 0
    total_sessions: int = 0
    total_earnings: float = 0.0
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}
        populate_by_name = True

# Teacher Review Models
class TeacherReview(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    teacher_id: PyObjectId
    student_id: PyObjectId
    student_name: Optional[str] = None
    student_avatar: Optional[str] = None
    rating: int  # 1-5
    comment: Optional[str] = None
    session_id: Optional[PyObjectId] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}
        populate_by_name = True

class TeacherReviewCreate(BaseModel):
    rating: int
    comment: Optional[str] = None

# Hiring/Session Models
class HireRequestStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class SessionType(str, Enum):
    HOURLY = "hourly"
    COURSE = "course"
    MONTHLY = "monthly"

class HireRequest(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    teacher_id: PyObjectId
    student_id: PyObjectId
    session_type: SessionType
    subject: str
    description: Optional[str] = None
    proposed_schedule: Optional[Dict[str, Any]] = None
    duration_hours: Optional[int] = None
    start_time: Optional[datetime] = None  # When session starts
    end_time: Optional[datetime] = None    # When session ends
    total_price: float
    status: HireRequestStatus = HireRequestStatus.PENDING
    payment_status: str = "pending"  # pending, completed, refunded
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}
        populate_by_name = True

class HireRequestCreate(BaseModel):
    teacher_id: str
    session_type: SessionType
    subject: str
    description: Optional[str] = None
    proposed_schedule: Optional[Dict[str, Any]] = None
    duration_hours: Optional[int] = None
    start_time: Optional[str] = None  # ISO format datetime string
    end_time: Optional[str] = None    # ISO format datetime string

class HireRequestUpdate(BaseModel):
    status: Optional[HireRequestStatus] = None
    proposed_schedule: Optional[Dict[str, Any]] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class TeachingSession(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    hire_request_id: PyObjectId
    teacher_id: PyObjectId
    student_id: PyObjectId
    subject: str
    scheduled_time: Optional[datetime] = None
    duration_minutes: int = 60
    meeting_link: Optional[str] = None
    notes: Optional[str] = None
    status: str = "scheduled"  # scheduled, ongoing, completed, cancelled
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}
        populate_by_name = True
