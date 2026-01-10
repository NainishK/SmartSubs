import sys
import os

# Create a path to the backend directory
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from sqlalchemy.orm import Session
from database import SessionLocal
import models

def fix_fancode():
    db = SessionLocal()
    try:
        # Find FanCode
        service = db.query(models.Service).filter(models.Service.name == "FanCode", models.Service.country == "IN").first()
        if not service:
            print("FanCode not found!")
            return

        print(f"Current Category: {service.category}")
        service.category = "OTHER"
        db.commit()
        print("Updated FanCode category to OTHER")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error updating FanCode: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_fancode()
