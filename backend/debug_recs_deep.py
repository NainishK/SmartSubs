
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
import tmdb_client
from config import settings

# Setup DB
DATABASE_URL = "sqlite:///./sql_app.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def deep_debug(user_id=1):
    print(f"\n--- DEBUGGING USER {user_id} ---")
    
    # 1. Check Subscriptions
    subs = db.query(models.Subscription).filter(
        models.Subscription.user_id == user_id, 
        models.Subscription.is_active == True
    ).all()
    print(f"\n[1] Found {len(subs)} Active Subscriptions:")
    for s in subs:
        print(f"    - ID: {s.id} | Name: '{s.service_name}'")

    if not subs:
        print("!!! NO ACTIVE SUBSCRIPTIONS. This explains everything.")
        return

    # 2. Check Watchlist
    watchlist = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.user_id == user_id,
        models.WatchlistItem.status.in_(['plan_to_watch', 'watching'])
    ).all()
    print(f"\n[2] Found {len(watchlist)} Watchlist Items (Plan to Watch/Watching):")
    
    if not watchlist:
        print("!!! NO WATCHLIST ITEMS. Cannot generate recommendations.")
        return

    # 3. Test Matching Logic on First 3 Items
    print(f"\n[3] Testing Provider Matching for first 3 items:")
    
    for item in watchlist[:3]:
        print(f"\n    > Item: '{item.title}' (TMDB ID: {item.tmdb_id}, Type: {item.media_type})")
        
        # Call TMDB Direct
        print(f"      Fetching providers via tmdb_client...")
        try:
            providers = tmdb_client.get_watch_providers(item.media_type, item.tmdb_id)
            print(f"      RAW TMDB RESPONSE: {providers}")
        except Exception as e:
            print(f"      !!! TMDB ERROR: {e}")
            continue
            
        if not providers:
            print(f"      !!! No providers returned (Empty Dict). Check API Key or Rate Limit.")
            continue
            
        flatrate = providers.get("flatrate", [])
        print(f"      Flatrate Providers found: {[p['provider_name'] for p in flatrate]}")
        
        # Test Match
        matched = False
        for p in flatrate:
            p_name = p["provider_name"]
            for sub in subs:
                sub_name = sub.service_name
                
                # REPLICATE LOGIC EXACTLY
                match_condition = sub_name.lower() in p_name.lower() or p_name.lower() in sub_name.lower()
                
                print(f"        Comparing '{p_name}' vs '{sub_name}': {'MATCH' if match_condition else 'NO MATCH'}")
                if match_condition:
                    matched = True
        
        if matched:
            print(f"      => RESULT: SUCCESS (Should appear in Watch Now)")
        else:
            print(f"      => RESULT: FAILURE (Will NOT appear)")

if __name__ == "__main__":
    deep_debug()
