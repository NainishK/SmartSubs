from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User
from recommendations import calculate_similar_content
import json

DATABASE_URL = "sqlite:///./sql_app.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

from recommendations import calculate_similar_content, calculate_dashboard_recommendations

def verify():
    db = SessionLocal()
    user = db.query(User).first()
    if not user:
        print("No user found.")
        return

    print(f"Testing recommendations for user {user.email}...")
    try:
        print("--- Dashboard Recs (Watch Now / Cancel) ---")
        dash_recs = calculate_dashboard_recommendations(db, user.id)
        for r in dash_recs:
            print(f"Type: {r['type']}, Service: {r.get('service_name')}, Items: {r.get('items')}")
            
        print("\n--- Similar Recs ---")
        recs = calculate_similar_content(db, user.id)
        print(f"Generated {len(recs)} similar/discovery recommendations.")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verify()
