from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./sql_app.db"
    SECRET_KEY: str = "YOUR_SECRET_KEY_HERE"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    TMDB_API_KEY: str = "YOUR_TMDB_API_KEY_HERE"
    GEMINI_API_KEY: str = "YOUR_GEMINI_API_KEY_HERE"

    class Config:
        env_file = ".env"

settings = Settings()
