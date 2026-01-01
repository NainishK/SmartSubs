from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User, UserInterest, Subscription, WatchlistItem
import tmdb_client
import time

DATABASE_URL = "sqlite:///./sql_app.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def debug_yield():
    db = SessionLocal()
    user = db.query(User).first()
    if not user: return
    
    print(f"User: {user.id}")
    subscriptions = db.query(Subscription).filter(Subscription.user_id == user.id, Subscription.is_active == True).all()
    print(f"Subs: {[s.service_name for s in subscriptions]}")
    interests = db.query(UserInterest).filter(UserInterest.user_id == user.id).order_by(UserInterest.score.desc()).limit(2).all()
    print(f"Interests: {[i.genre_id for i in interests]}")

    # Provider String
    PROVIDER_IDS_MAP = {
        "netflix": "8", "hulu": "15", "amazon prime video": "9", "disney plus": "337",
        "max": "384|312", "peacock": "386", "apple tv plus": "350", "paramount plus": "83|531"
    }
    valid_ids = set()
    for sub in subscriptions:
        k = sub.service_name.lower()
        if k in PROVIDER_IDS_MAP: valid_ids.add(PROVIDER_IDS_MAP[k])
        # Fuzzy
        for mk, mv in PROVIDER_IDS_MAP.items():
            if mk in k or k in mk: valid_ids.add(mv)
            
    p_str = "|".join(valid_ids)
    print(f"Provider String: {p_str}")

    # Test Strategy A
    if interests:
        print("\n--- Testing Strategy A (Discovery) ---")
        data = tmdb_client.discover_media(
            "movie", with_genres=str(interests[0].genre_id), 
            sort_by="vote_average.desc", min_vote_count=200, min_vote_average=6.0,
            with_watch_providers=p_str, watch_region="US"
        )
        items = data.get("results", [])
        print(f"API returned {len(items)} items.")
        
        passed = 0
        for i, item in enumerate(items[:10]):
            print(f"Check {i}: {item['title']} (ID: {item['id']})")
            provs = tmdb_client.get_watch_providers("movie", item['id'])
            
            flat = provs.get("flatrate", [])
            print(f"  Providers: {[p['provider_name'] for p in flat]}")
            
            matched = False
            if flat:
                for p in flat:
                    p_name = p['provider_name'].lower()
                    for sub in subscriptions:
                        if sub.service_name.lower() in p_name:
                            matched = True
                            print(f"  MATCH: {sub.service_name} in {p_name}")
                            break
                    if matched: break
            
            if matched: passed += 1
            else: print("  FAIL: No match found.")
            
        print(f"Yield A: {passed}/10 tested.")

    db.close()

if __name__ == "__main__":
    debug_yield()
