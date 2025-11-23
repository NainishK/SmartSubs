from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

def seed_data():
    db = SessionLocal()
    try:
        # Create tables if not exist (this might not update existing ones, but good for fresh start)
        models.Base.metadata.create_all(bind=engine)

        # Clear existing services/plans to avoid duplicates
        db.query(models.Plan).delete()
        db.query(models.Service).delete()
        
        # Define seed data
        services_data = [
            {
                "name": "Netflix",
                "plans": [
                    {"name": "Standard with ads", "cost": 6.99},
                    {"name": "Standard", "cost": 15.49},
                    {"name": "Premium", "cost": 22.99}
                ]
            },
            {
                "name": "Hulu",
                "plans": [
                    {"name": "Ad-supported", "cost": 7.99},
                    {"name": "No Ads", "cost": 17.99}
                ]
            },
            {
                "name": "Amazon Prime Video",
                "plans": [
                    {"name": "Prime Video Membership", "cost": 8.99},
                    {"name": "Amazon Prime (Full)", "cost": 14.99}
                ]
            },
            {
                "name": "Disney Plus",
                "plans": [
                    {"name": "Basic (With Ads)", "cost": 7.99},
                    {"name": "Premium (No Ads)", "cost": 13.99}
                ]
            },
            {
                "name": "Max",
                "plans": [
                    {"name": "With Ads", "cost": 9.99},
                    {"name": "Ad-Free", "cost": 15.99},
                    {"name": "Ultimate Ad-Free", "cost": 19.99}
                ]
            }
        ]

        for svc in services_data:
            service = models.Service(name=svc["name"])
            db.add(service)
            db.commit()
            db.refresh(service)
            
            for plan in svc["plans"]:
                db_plan = models.Plan(
                    service_id=service.id,
                    name=plan["name"],
                    cost=plan["cost"],
                    currency="USD"
                )
                db.add(db_plan)
            
        db.commit()
        print("Seed data inserted successfully!")

    except Exception as e:
        print(f"Error seeding data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
