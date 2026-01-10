import sys
import os

# Create a path to the backend directory
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

def add_fancode():
    db = SessionLocal()
    try:
        # Check if FanCode already exists
        existing = db.query(models.Service).filter(models.Service.name == "FanCode", models.Service.country == "IN").first()
        if existing:
            print("FanCode already exists!")
            return

        print("Adding FanCode...")
        
        # Define FanCode Data
        fancode_data = {
            "name": "FanCode",
            "country": "IN",
            "domain": "fancode.com",
            "category": "OTT",
            "plans": [
                {"name": "Monthly Pass", "cost": 199, "currency": "INR", "country": "IN", "billing_cycle": "monthly"},
                {"name": "Yearly Pass", "cost": 999, "currency": "INR", "country": "IN", "billing_cycle": "yearly"},
                {"name": "Tour Pass (Match)", "cost": 99, "currency": "INR", "country": "IN", "billing_cycle": "monthly"} # Approx for single tour
            ]
        }

        domain = fancode_data.get("domain", "")
        logo_url = f"https://www.google.com/s2/favicons?sz=128&domain={domain}" if domain else None
        
        service = models.Service(
            name=fancode_data["name"],
            country=fancode_data.get("country", "IN"),
            logo_url=logo_url,
            category=fancode_data.get("category", "OTT")
        )
        db.add(service)
        db.commit()
        db.refresh(service)
        
        for plan in fancode_data["plans"]:
            db_plan = models.Plan(
                service_id=service.id,
                name=plan["name"],
                cost=plan["cost"],
                currency=plan.get("currency", "INR"),
                billing_cycle=plan.get("billing_cycle", "monthly"),
                country=plan.get("country", "IN")
            )
            db.add(db_plan)
        
        db.commit()
        print("FanCode added successfully!")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error adding FanCode: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_fancode()
