from sqlalchemy.orm import Session
from database import SessionLocal
from models import WatchlistItem
import sys
import os

# Add current directory to path so we can import modules
sys.path.append(os.getcwd())

db: Session = SessionLocal()
item = db.query(WatchlistItem).filter(WatchlistItem.title.ilike("%Haikyuu%")).first()

if item:
    print(f"Title: {item.title}")
    print(f"Media Type: {item.media_type}")
    print(f"Genre IDs (Raw DB): '{item.genre_ids}'")
else:
    print("Haikyuu not found in DB")
