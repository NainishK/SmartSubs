from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

def seed_data():
    db = SessionLocal()
    try:
        # Create tables if not exist
        models.Base.metadata.create_all(bind=engine)

        # Clear existing services/plans to avoid duplicates
        db.query(models.Plan).delete()
        db.query(models.Service).delete()
        
        # Define seed data
        services_data = [
            {
                "name": "Netflix",
                "country": "US",
                "domain": "netflix.com",
                "plans": [
                    {"name": "Standard with ads", "cost": 6.99, "currency": "USD", "country": "US", "billing_cycle": "monthly"},
                    {"name": "Standard", "cost": 15.49, "currency": "USD", "country": "US", "billing_cycle": "monthly"},
                    {"name": "Premium", "cost": 22.99, "currency": "USD", "country": "US", "billing_cycle": "monthly"}
                ]
            },
            {
                "name": "Netflix",
                "country": "IN",
                "domain": "netflix.com",
                "plans": [
                    {"name": "Mobile", "cost": 149, "currency": "INR", "country": "IN", "billing_cycle": "monthly"},
                    {"name": "Basic", "cost": 199, "currency": "INR", "country": "IN", "billing_cycle": "monthly"},
                    {"name": "Standard", "cost": 499, "currency": "INR", "country": "IN", "billing_cycle": "monthly"},
                    {"name": "Premium", "cost": 649, "currency": "INR", "country": "IN", "billing_cycle": "monthly"}
                ]
            },
            {
                "name": "JioHotstar",
                "country": "IN",
                "domain": "jiohotstar.com",
                "plans": [
                    {"name": "Monthly Base (with ads)", "cost": 149, "currency": "INR", "country": "IN", "billing_cycle": "monthly"},
                    {"name": "Premium Monthly", "cost": 299, "currency": "INR", "country": "IN", "billing_cycle": "monthly"},
                    {"name": "Premium Annual", "cost": 1499, "currency": "INR", "country": "IN", "billing_cycle": "yearly"},
                    {"name": "Family Annual (4 screens)", "cost": 2499, "currency": "INR", "country": "IN", "billing_cycle": "yearly"}
                ]
            },
            {
                "name": "Amazon Prime Video",
                "country": "IN",
                "domain": "primevideo.com",
                "plans": [
                    {"name": "Monthly", "cost": 299, "currency": "INR", "country": "IN", "billing_cycle": "monthly"},
                    {"name": "Annual", "cost": 1499, "currency": "INR", "country": "IN", "billing_cycle": "yearly"},
                    {"name": "Lite (Annual)", "cost": 799, "currency": "INR", "country": "IN", "billing_cycle": "yearly"}
                ]
            },
            {
                "name": "Zee5",
                "country": "IN",
                "domain": "zee5.com",
                "plans": [
                    {"name": "Premium 4K (Annual)", "cost": 1199, "currency": "INR", "country": "IN", "billing_cycle": "yearly"},
                    {"name": "Premium HD (Annual)", "cost": 899, "currency": "INR", "country": "IN", "billing_cycle": "yearly"},
                    {"name": "Premium Monthly", "cost": 199, "currency": "INR", "country": "IN", "billing_cycle": "monthly"}
                ]
            },
            {
                "name": "SonyLIV",
                "country": "IN",
                "domain": "sonyliv.com",
                "plans": [
                    {"name": "LIV Premium Monthly", "cost": 299, "currency": "INR", "country": "IN", "billing_cycle": "monthly"},
                    {"name": "LIV Premium Yearly", "cost": 999, "currency": "INR", "country": "IN", "billing_cycle": "yearly"}
                ]
            },
            {
                "name": "Hulu",
                "country": "US",
                "domain": "hulu.com",
                "plans": [
                    {"name": "Ad-supported", "cost": 7.99, "currency": "USD", "country": "US", "billing_cycle": "monthly"},
                    {"name": "No Ads", "cost": 17.99, "currency": "USD", "country": "US", "billing_cycle": "monthly"}
                ]
            },
            {
                "name": "Disney+",
                "country": "US",
                "domain": "disneyplus.com",
                "plans": [
                    {"name": "Basic (with ads)", "cost": 7.99, "currency": "USD", "country": "US", "billing_cycle": "monthly"},
                    {"name": "Premium (no ads)", "cost": 13.99, "currency": "USD", "country": "US", "billing_cycle": "monthly"}
                ]
            },
            {
                "name": "Amazon Prime Video",
                "country": "US",
                "domain": "primevideo.com",
                "plans": [
                    {"name": "Prime Video Membership", "cost": 8.99, "currency": "USD", "country": "US", "billing_cycle": "monthly"},
                    {"name": "Amazon Prime (Full)", "cost": 14.99, "currency": "USD", "country": "US", "billing_cycle": "monthly"}
                ]
            },
            {
                "name": "YouTube Premium",
                "country": "IN",
                "domain": "youtube.com",
                "plans": [
                    {"name": "Individual Monthly", "cost": 149, "currency": "INR", "country": "IN", "billing_cycle": "monthly"},
                    {"name": "Family Monthly", "cost": 299, "currency": "INR", "country": "IN", "billing_cycle": "monthly"},
                    {"name": "Student Monthly", "cost": 79, "currency": "INR", "country": "IN", "billing_cycle": "monthly"}
                ]
            }
        ]

        for svc in services_data:
            domain = svc.get("domain", "")
            logo_url = f"https://www.google.com/s2/favicons?sz=128&domain={domain}" if domain else None
            
            service = models.Service(
                name=svc["name"],
                country=svc.get("country", "US"),
                logo_url=logo_url
            )
            db.add(service)
            db.commit()
            db.refresh(service)
            
            for plan in svc["plans"]:
                db_plan = models.Plan(
                    service_id=service.id,
                    name=plan["name"],
                    cost=plan["cost"],
                    currency=plan.get("currency", "USD"),
                    billing_cycle=plan.get("billing_cycle", "monthly"),
                    country=plan.get("country", "US")
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
