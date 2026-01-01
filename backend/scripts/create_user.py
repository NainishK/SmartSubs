from sqlalchemy.orm import Session
from database import SessionLocal
import models
import security

def create_user():
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(models.User).filter(models.User.email == "nainishkher@gmail.com").first()
        if existing_user:
            print("User already exists!")
            return
        
        # Create user with hashed password
        hashed_password = security.get_password_hash("password")
        user = models.User(
            email="nainishkher@gmail.com",
            hashed_password=hashed_password,
            is_active=True,
            country="IN"  # Set to India for regional experience
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print(f"User created successfully! ID: {user.id}")
        print(f"Email: {user.email}")
        print(f"Country: {user.country}")
        
    except Exception as e:
        print(f"Error creating user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_user()
