import sys
import os

# Add parent dir to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from crud import get_user, get_user_subscriptions
import tmdb_client

def debug_badge_logic(user_id=1, tmdb_id=105009, media_type='tv'):
    db = SessionLocal()
    try:
        print(f"--- Debugging Badge Logic for User {user_id}, Item {tmdb_id} ({media_type}) ---")
        
        # 1. Get User Info
        user = get_user(db, user_id)
        if not user:
            print("User not found!")
            return
        
        country = user.country if user.country else "US"
        print(f"User Country: {country}")
        
        user_subs = get_user_subscriptions(db, user_id)
        active_services = {sub.service_name.lower() for sub in user_subs}
        print(f"User Active Subs (Normalized): {active_services}")
        
        # 2. Fetch Providers
        print(f"Fetching providers for Region: {country}...")
        providers = tmdb_client.get_watch_providers(media_type, tmdb_id, region=country)
        flatrate = providers.get("flatrate", [])
        print(f"TMDB Flatrate Providers: {[p.get('provider_name') for p in flatrate]}")
        
        # 3. Match Logic
        matched_provider = None
        for p in flatrate:
            p_name = p.get("provider_name", "")
            p_lower = p_name.lower()
            
            print(f"Checking provider: '{p_name}' (norm: '{p_lower}')")
            
            for sub_name in active_services:
                # The logic in crud.py
                match = sub_name in p_lower or p_lower in sub_name
                print(f"  vs User Sub '{sub_name}': {match}")
                
                if match:
                    matched_provider = p_name
                    print(f"  MATCH FOUND! -> {matched_provider}")
                    break
            if matched_provider:
                break
                
        if matched_provider:
            print(f"RESULT: Would save available_on = '{matched_provider}'")
        else:
            print("RESULT: No match found. Badge would be empty.")
            
        # 4. Check ACTUAL DB state
        print("\n--- Inspecting Live DB State ---")
        import models
        item = db.query(models.WatchlistItem).filter(
            models.WatchlistItem.user_id == user_id,
            models.WatchlistItem.tmdb_id == tmdb_id
        ).first()
        
        if item:
            print(f"Item Found in DB!")
            print(f"Title: {item.title}")
            print(f"Available On (DB Column): '{item.available_on}'")
        else:
            print("Item NOT found in DB (User might have deleted it again?)")

    finally:
        db.close()

if __name__ == "__main__":
    debug_badge_logic()
