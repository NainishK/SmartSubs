from database import SessionLocal
from models import User

db = SessionLocal()
emails_to_check = ["test@example7.com", "test@exaple7.com"]

print("Checking emails:")
for email in emails_to_check:
    user = db.query(User).filter(User.email == email).first()
    if user:
        print(f"✅ FOUND: {email} (ID: {user.id})")
    else:
        print(f"❌ NOT FOUND: {email}")
