from database import SessionLocal
from models import User
import crud
import json

def verify_fix():
    db = SessionLocal()
    user = db.query(User).filter(User.id == 1).first()
    if not user:
        print("User 1 not found")
        return

    print("Attempting to call crud.update_user_preferences with a STRING...")
    try:
        # Pass a raw JSON string (simulating main.py behavior)
        crud.update_user_preferences(db, user_id=user.id, preferences='{"test_key": "test_value"}')
        print("SUCCESS: Function executed without crashing.")
    except AttributeError as e:
        print(f"FAILURE: AttributeError detected: {e}")
    except Exception as e:
         print(f"FAILURE: Other error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_fix()
