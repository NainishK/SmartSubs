import os
import crud
from database import SessionLocal, SQLALCHEMY_DATABASE_URL

print(f"Propagated DB URL: {SQLALCHEMY_DATABASE_URL}")
print(f"CWD: {os.getcwd()}")

db = SessionLocal()
email = "bhatkar.abhishek81@gmail.com"
db_user = crud.get_user_by_email(db, email=email)

if db_user:
    print(f"CRUD FOUND: {db_user.email}")
else:
    print(f"CRUD NOT FOUND: {email}")

# Check for similar emails (case, whitespace)
all_users = db.query(crud.models.User).all()
print("\nAll Users:")
for u in all_users:
    print(f"'{u.email}'")
