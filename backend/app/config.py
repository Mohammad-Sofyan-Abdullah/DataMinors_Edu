import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def get_env(key: str, default=None, cast=str):
    value = os.getenv(key, default)
    if value is None:
        return None
    if cast == int and value is not None:
        return int(value)
    return value

class Settings:
    # Database
    MONGODB_URL: str = get_env("MONGODB_URL", "mongodb://localhost:27017/")
    DATABASE_NAME: str = get_env("DATABASE_NAME", "PeerLearn")
    
    # JWT
    SECRET_KEY: str = get_env("SECRET_KEY", "your-secret-key-change-this-in-production")
    ALGORITHM: str = get_env("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = get_env("ACCESS_TOKEN_EXPIRE_MINUTES", "30", cast=int)
    REFRESH_TOKEN_EXPIRE_DAYS: int = get_env("REFRESH_TOKEN_EXPIRE_DAYS", "7", cast=int)
    
    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = get_env("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: Optional[str] = get_env("GOOGLE_CLIENT_SECRET")
    
    # Groq API
    GROQ_API_KEY: Optional[str] = get_env("GROQ_API_KEY")
    
    # YouTube Service
    USE_TEST_YOUTUBE_SERVICE: bool = get_env("USE_TEST_YOUTUBE_SERVICE", "false").lower() == "true"
    
    # Email
    EMAIL_HOST: str = get_env("EMAIL_HOST", "smtp.gmail.com")
    EMAIL_PORT: int = get_env("EMAIL_PORT", "587", cast=int)
    EMAIL_USERNAME: Optional[str] = get_env("EMAIL_USERNAME")
    EMAIL_PASSWORD: Optional[str] = get_env("EMAIL_PASSWORD")

settings = Settings()



