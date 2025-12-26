from sqlalchemy.orm import Session
from database import SessionLocal
import models

def verify_data():
    db = SessionLocal()
    try:
        # Check services
        services = db.query(models.Service).all()
        print(f"\n=== TOTAL SERVICES: {len(services)} ===")
        
        # Group by country
        us_services = [s for s in services if s.country == "US"]
        in_services = [s for s in services if s.country == "IN"]
        
        print(f"\nUS Services ({len(us_services)}):")
        for s in us_services:
            plans_count = len(s.plans)
            print(f"  - {s.name} (ID: {s.id}, {plans_count} plans)")
        
        print(f"\nIN Services ({len(in_services)}):")
        for s in in_services:
            plans_count = len(s.plans)
            print(f"  - {s.name} (ID: {s.id}, {plans_count} plans)")
        
        # Check users
        users = db.query(models.User).all()
        print(f"\n=== TOTAL USERS: {len(users)} ===")
        for u in users:
            print(f"  - {u.email} (Country: {u.country}, Active: {u.is_active})")
        
        # Check subscriptions
        subs = db.query(models.Subscription).all()
        print(f"\n=== TOTAL SUBSCRIPTIONS: {len(subs)} ===")
        
        # Check watchlist
        watchlist = db.query(models.WatchlistItem).all()
        print(f"\n=== TOTAL WATCHLIST ITEMS: {len(watchlist)} ===")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_data()
