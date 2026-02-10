import sys
import os

# Ensure backend directory is in python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_dir)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import WatchlistItem

# Direct setup avoiding relative import issues
SQLALCHEMY_DATABASE_URL = "sqlite:///sql_app.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

db = SessionLocal()
item = db.query(WatchlistItem).filter(WatchlistItem.title.ilike("%Haikyuu%")).first()

if item:
    print(f"Title: {item.title}")
    print(f"Media Type: {item.media_type}")
    print(f"Genre IDs (Raw DB): '{item.genre_ids}'")
else:
    print("Haikyuu not found in DB")
