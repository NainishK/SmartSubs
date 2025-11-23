from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    TMDB_API_KEY: str = "YOUR_TMDB_API_KEY_HERE"
    SECRET_KEY: str = "SECRET_KEY_GOES_HERE_TODO_CHANGE_ME"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
