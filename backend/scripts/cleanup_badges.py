import sys
import os

# Add parent dir to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from crud import get_user, get_user_subscriptions, get_watchlist
import models

def cleanup_badges(user_id=1):
    db = SessionLocal()
    try:
        print(f"--- Cleaning up Stale Badges for User {user_id} ---")
        
        # 1. Get User Active Subs
        user_subs = get_user_subscriptions(db, user_id)
        active_services = {sub.service_name.lower() for sub in user_subs}
        print(f"User Active Subs: {active_services}")
        
        # 2. Get All Watchlist Items
        items = db.query(models.WatchlistItem).filter(models.WatchlistItem.user_id == user_id).all()
        print(f"Checking {len(items)} items...")
        
        updated_count = 0
        
        for item in items:
            if not item.available_on:
                continue
                
            provider = item.available_on.lower()
            
            # Check match
            match_found = False
            for sub in active_services:
                if sub in provider or provider in sub:
                    match_found = True
                    break
            
            if not match_found:
                print(f"REMOVING: '{item.title}' has '{item.available_on}' but user lacks subscription.")
                item.available_on = None
                updated_count += 1
                
        if updated_count > 0:
            db.commit()
            print(f"\nSUCCESS: Removed {updated_count} invalid badges from your list.")
        else:
            print("\nAll clean! No invalid badges found.")
            
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_badges()
