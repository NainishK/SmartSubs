from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User, WatchlistItem, RecommendationCache
import json

DATABASE_URL = "sqlite:///./sql_app.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def debug_state():
    db = SessionLocal()
    user = db.query(User).first()
    if not user:
        print("No user found.")
        return

    print(f"User: {user.email} (ID: {user.id})")
    
    print("\n--- Watchlist Items ---")
    items = db.query(WatchlistItem).filter(WatchlistItem.user_id == user.id).all()
    for item in items:
        print(f"[{item.id}] {item.title} - Status: '{item.status}' - TMDB ID: {item.tmdb_id}")

    print("\n--- Clearing Cache ---")
    try:
        deleted = db.query(RecommendationCache).filter(RecommendationCache.user_id == user.id).delete()
        db.commit()
        print(f"Deleted {deleted} cache entries.")
    except Exception as e:
        print(f"Error clearing cache: {e}")
        
    db.close()

if __name__ == "__main__":
    debug_state()
