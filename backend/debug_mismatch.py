from sqlalchemy.orm import Session
from database import SessionLocal
import models
import tmdb_client

def debug_recommendation_mismatch():
    db = SessionLocal()
    try:
        # 1. List all users and subs
        users = db.query(models.User).all()
        for u in users:
            print(f"\nUser: {u.email} (ID: {u.id})")
            for sub in u.subscriptions:
                print(f"  - Sub: '{sub.service_name}'")
            
            # Check watchlist too
            for item in u.watchlist:
                print(f"  - Watchlist: '{item.title}'")

        # 2. Check 'The Boys' Providers
        print("\n--- Providers for 'The Boys' (TV 76479) ---")
        providers = tmdb_client.get_watch_providers("tv", 76479)
        if "flatrate" in providers:
            for p in providers["flatrate"]:
                print(f"Provider: '{p['provider_name']}'")
        else:
            print("No flatrate providers found.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_recommendation_mismatch()
