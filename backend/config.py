from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./sql_app.db"
    SECRET_KEY: str = "YOUR_SECRET_KEY_HERE"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 Days (60 * 24 * 7)
    TMDB_API_KEY: str = "YOUR_TMDB_API_KEY_HERE"
    GEMINI_API_KEY: str = "YOUR_GEMINI_API_KEY_HERE"
    
    # Email Settings
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "noreply@smartsubs.app"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
    MAIL_SSL_TLS: bool = False
    USE_CREDENTIALS: bool = True
    
    # OAuth Settings
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/callback/google"
    
    # Frontend Settings
    FRONTEND_URL: str = "http://localhost:3000"



    @field_validator("FRONTEND_URL")
    def strip_slash(cls, v):
        return v.rstrip("/")

    class Config:
        env_file = ".env"

settings = Settings()
