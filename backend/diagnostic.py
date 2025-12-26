import models
from database import SessionLocal
import json
import crud

def diagnostic():
    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        for user in users:
            print(f"\nUser: {user.email} (ID: {user.id})")
            
            subs = db.query(models.Subscription).filter(models.Subscription.user_id == user.id).all()
            print(f"Subscriptions ({len(subs)}):")
            for s in subs:
                print(f"  - [{s.id}] {s.service_name} (Active: {s.is_active})")
            
            cache = db.query(models.RecommendationCache).filter(models.RecommendationCache.user_id == user.id).all()
            print(f"Cache Entries ({len(cache)}):")
            for c in cache:
                data = json.loads(c.data)
                print(f"  - {c.category} (Updated: {c.updated_at})")
                if c.category == 'dashboard':
                    types = set(r.get('type') for r in data)
                    names = [r.get('service_name') for r in data]
                    print(f"    Types: {types}, Services in Cache: {names}")
    finally:
        db.close()

if __name__ == "__main__":
    diagnostic()
