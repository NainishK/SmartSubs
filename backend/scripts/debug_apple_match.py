from sqlalchemy.orm import Session
from database import SessionLocal
import models
import tmdb_client
import sys

def debug_matching():
    db = SessionLocal()
    user_email = "nainish@example.com" # Assuming default user or fetch first
    user = db.query(models.User).first()
    if not user:
        print("No user found!")
        return

    print(f"DEBUG: User Country: {user.country}")

    # 1. Fetch Active Subscriptions
    subs = db.query(models.Subscription).filter(
        models.Subscription.user_id == user.id,
        models.Subscription.is_active == True,
        models.Subscription.category == 'OTT'
    ).all()
    
    print("\n--- ACTIVE SUBSCRIPTIONS ---")
    for s in subs:
        print(f"ID: {s.id}, Name: '{s.service_name}', Key: '{s.service_name.lower()}'")
    
    # 2. Define IDs to test (Silo, Demon Slayer, Attack on Titan)
    # Using specific TMDB IDs based on common knowledge, or fetching from user's watchlist
    test_items = [
        {"id": 125988, "title": "Silo", "media_type": "tv"}, # Apple TV+
        {"id": 85937, "title": "Demon Slayer", "media_type": "tv"}, # Crunchyroll/Netflix
        {"id": 1429, "title": "Attack on Titan", "media_type": "tv"}, # Crunchyroll
        {"id": 95558, "title": "Severance", "media_type": "tv"}, # Apple TV+
    ]

    # Robust Provider Map (COPIED FROM main.py)
    PROVIDER_IDS_MAP = {
        "netflix": "8",
        "hulu": "15", 
        "amazon prime video": "9",
        "disney plus": "337",
        "max": "384|312",
        "peacock": "386",
        "apple tv plus": "350",
        "apple tv+": "350",
        "paramount plus": "83|531",
        "crunchyroll": "283",
        "hotstar": "122",
        "disney+ hotstar": "122",
        "jiocinema": "220",
        "jiohotstar": "122|220"
    }

    print("\n--- MATCHING LOGIC TEST ---")
    for item in test_items:
        print(f"\nChecking: {item['title']} ({item['id']})")
        try:
            # Bypass cache for debug ? No, let's see what cached returns, or force fresh if needed.
            # actually we want to test tmdb response.
            providers = tmdb_client.get_watch_providers(item['media_type'], item['id'], region=user.country or "US")
            
            if "flatrate" in providers:
                flatrate_providers = providers["flatrate"]
                print(f"  > TMDB Providers: {[f'{p['provider_name']} ({p['provider_id']})' for p in flatrate_providers]}")
                
                matched_sub = None
                for p in flatrate_providers:
                    p_name = p["provider_name"]
                    p_id = str(p["provider_id"])
                    
                    for sub in subs:
                        # 1. ID Match logic
                        s_key = sub.service_name.lower()
                        mapped_ids = []
                        
                        # LOGIC REPLICATION
                        if s_key in PROVIDER_IDS_MAP:
                            mapped_ids = PROVIDER_IDS_MAP[s_key].split("|")
                        else:
                            for k, v in PROVIDER_IDS_MAP.items():
                                if k in s_key or s_key in k:
                                    mapped_ids = v.split("|")
                                    break
                        
                        # print(f"    - Checking Sub '{s.service_name}': Mapped IDs={mapped_ids} vs Provider ID={p_id}")
                        
                        if p_id in mapped_ids:
                            print(f"    !!! MATCH FOUND (ID): {sub.service_name} (Map: {mapped_ids} == {p_id})")
                            matched_sub = sub.service_name
                            break
                        
                        # 2. Name Match logic
                        if sub.service_name.lower() in p_name.lower() or p_name.lower() in sub.service_name.lower():
                            print(f"    !!! MATCH FOUND (Name): {sub.service_name} vs {p_name}")
                            matched_sub = sub.service_name
                            break
                    if matched_sub: break
                
                if not matched_sub:
                    print("  > NO MATCH FOUND in active subs.")
            else:
                print("  > No 'flatrate' providers found in TMDB response.")
        
        except Exception as e:
            print(f"  > ERROR: {e}")

if __name__ == "__main__":
    debug_matching()
