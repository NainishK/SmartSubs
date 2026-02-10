import crud
from database import SessionLocal
from models import User

db = SessionLocal()
search_term = "bhatkar"
users = db.query(User).filter(User.email.contains(search_term)).all()

print(f"Searching for '{search_term}'...")
if users:
    for u in users:
        print(f"FOUND: ID={u.id}")
        print(f"Email: '{u.email}'")  # Quotes to see whitespace
        print(f"Active: {u.is_active}")
        print(f"Hex: {u.email.encode('utf-8').hex()}") # Check hidden chars
else:
    print("No matches found.")
