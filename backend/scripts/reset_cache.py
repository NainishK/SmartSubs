import sys
import os

# Add project root to path
# C:\Personal\Projects\Subscription-manager\backend\scripts\reset_cache.py -> C:\Personal\Projects\Subscription-manager
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.database import SessionLocal
from backend import models

def clear_cache():
    db = SessionLocal()
    try:
        print("Clearing recommendation cache...")
        num_deleted = db.query(models.RecommendationCache).delete()
        db.commit()
        print(f"Deleted {num_deleted} cache entries.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clear_cache()
