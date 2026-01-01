import sys
import os

# Add backend to path
sys.path.append(os.getcwd())

from database import SessionLocal
from models import WatchlistItem, Subscription, User
import tmdb_client

def debug_check():
    db = SessionLocal()
    
    # Get a user (assuming ID 1 for now, or first user)
    user = db.query(User).first()
    if not user:
        print("No user found")
        return

    print(f"DEBUG: User Country: {user.country}")
    
    # Get items
    items = db.query(WatchlistItem).filter(WatchlistItem.user_id == user.id).limit(5).all()
    if not items:
        print("No items in watchlist")
        return

    subs = db.query(Subscription).filter(
        Subscription.user_id == user.id,
        Subscription.is_active == True,
        Subscription.category == 'OTT'
    ).all()
    
    print(f"DEBUG: Active Subs: {[s.service_name for s in subs]}")
    
    PROVIDER_IDS_MAP = {
        "netflix": "8",
        "hulu": "15", 
        "amazon prime video": "9",
        "disney plus": "337",
        "max": "384|312",
        "peacock": "386",
        "apple tv plus": "350",
        "paramount plus": "83|531",
        "crunchyroll": "283",
        "hotstar": "122",
        "disney+ hotstar": "122",
        "jiocinema": "220",
        "jiohotstar": "122|220"
    }

    for item in items:
        print(f"\n--- Checking: {item.title} (ID: {item.tmdb_id}) ---")
        try:
            providers = tmdb_client.get_watch_providers(item.media_type, item.tmdb_id, region=user.country or "US")
            print(f"TMDB Response Keys: {providers.keys()}")
            
            if "flatrate" in providers:
                flatrate = providers["flatrate"]
                print(f"Flatrate Providers: {[{'id': p['provider_id'], 'name': p['provider_name']} for p in flatrate]}")
                
                # Match Logic
                matched_sub = None
                for p in flatrate:
                    p_name = p["provider_name"]
                    p_id = str(p["provider_id"])
                    
                    for sub in subs:
                        s_key = sub.service_name.lower()
                        mapped_ids = []
                        if s_key in PROVIDER_IDS_MAP:
                            mapped_ids = PROVIDER_IDS_MAP[s_key].split("|")
                        else:
                            for k, v in PROVIDER_IDS_MAP.items():
                                if k in s_key or s_key in k:
                                    mapped_ids = v.split("|")
                                    break
                        
                        # Check ID match
                        if p_id in mapped_ids:
                            print(f"  -> MATCHED ID: {p_id} ({p_name}) == {sub.service_name}")
                            matched_sub = sub.service_name
                            break
                        
                        # Check Name match
                        if sub.service_name.lower() in p_name.lower() or p_name.lower() in sub.service_name.lower():
                            print(f"  -> MATCHED NAME: {p_name} ~= {sub.service_name}")
                            matched_sub = sub.service_name
                            break
                    if matched_sub: break
                
                if matched_sub:
                    print(f"RESULT: Available on {matched_sub}")
                else:
                    print("RESULT: No subscription match found.")
            else:
                print("RESULT: No flatrate providers found for this region.")

        except Exception as e:
            print(f"ERROR: {e}")

if __name__ == "__main__":
    debug_check()
