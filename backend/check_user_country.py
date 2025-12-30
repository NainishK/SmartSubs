import sys
import os
sys.path.append(os.getcwd())
from database import SessionLocal
from models import User

db = SessionLocal()
user = db.query(User).first()
print(f"User ID: {user.id}")
print(f"User Country: '{user.country}'")
print(f"User Email: {user.email}")
