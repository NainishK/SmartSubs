from sqlalchemy.orm import Session
from database import SessionLocal
import models

def clear_cache():
    db = SessionLocal()
    try:
        # Get the first user (we assume single user for this debug)
        user = db.query(models.User).filter(models.User.email == "nainish.k@gmail.com").first()
        if not user:
            user = db.query(models.User).first()
            
        print(f"Clearing cache for user: {user.id}")
        
        # Delete Dashboard Cache
        deleted = db.query(models.RecommendationCache).filter(
            models.RecommendationCache.user_id == user.id,
            models.RecommendationCache.category == 'dashboard'
        ).delete()
        
        db.commit()
        print(f"Deleted {deleted} cache entries.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clear_cache()
