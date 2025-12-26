import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

try:
    import models
    from database import SessionLocal
    import json
    import crud
    print("Imports successful")
except Exception as e:
    print(f"Import failed: {e}")
    sys.exit(1)

def diagnostic():
    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        if not users:
            print("No users found")
            return
            
        for user in users:
            print(f"\nUser: {user.email} (ID: {user.id})")
            
            subs = db.query(models.Subscription).filter(models.Subscription.user_id == user.id).all()
            print(f"Subscriptions ({len(subs)}):")
            for s in subs:
                print(f"  - [{s.id}] {s.service_name} (Active: {s.is_active})")
            
            cache = db.query(models.RecommendationCache).filter(models.RecommendationCache.user_id == user.id).all()
            print(f"Cache Entries ({len(cache)}):")
            for c in cache:
                try:
                    data = json.loads(c.data)
                    print(f"  - {c.category} (Updated: {c.updated_at})")
                    if c.category == 'dashboard':
                        names = [r.get('service_name') for r in data if r.get('type') == 'cancel']
                        print(f"    Cancel Recs for: {names}")
                except Exception as ex:
                    print(f"  - Error reading {c.category} cache: {ex}")
    except Exception as e:
        print(f"Diagnostic failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    diagnostic()
