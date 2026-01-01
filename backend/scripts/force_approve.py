from database import SessionLocal
from models import User

def approve_requests():
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.ai_access_status == "requested").all()
        print(f"Found {len(users)} pending requests.")
        for u in users:
            print(f"Approving user {u.email}...")
            u.ai_allowed = True
            u.ai_access_status = "approved"
        
        db.commit()
        print("Done. All requests approved.")
        
    finally:
        db.close()

if __name__ == "__main__":
    approve_requests()
