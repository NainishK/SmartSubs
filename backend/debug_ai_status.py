from database import SessionLocal
from models import User

def check_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"--- USERS ({len(users)}) ---")
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}")
            print(f"   AI Allowed: {u.ai_allowed}")
            print(f"   Status: {u.ai_access_status}")
            print("-" * 20)
    finally:
        db.close()

if __name__ == "__main__":
    check_users()
