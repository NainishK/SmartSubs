from database import SessionLocal
from models import User

db = SessionLocal()
target_email = "bhatkar.abhishek81@gmail.com"
user = db.query(User).filter(User.email == target_email).first()

if user:
    print(f"FOUND: ID={user.id}, Email={user.email}, Active={user.is_active}")
else:
    print(f"NOT FOUND: {target_email}")
    
# Print all emails just in case
print("\nAll Emails:")
for u in db.query(User).all():
    print(f"- {u.email}")
