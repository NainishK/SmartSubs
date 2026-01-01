from sqlalchemy.orm import Session
from database import SessionLocal
import models
import recommendations
import json
import tmdb_client

def debug_dashboard():
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == "nainish.k@gmail.com").first() # Assuming this is the user
        if not user:
            user = db.query(models.User).first()
        
        print(f"DEBUG: User ID: {user.id}, Country: {user.country}")
        
        # Check Subscriptions
        subs = db.query(models.Subscription).filter(
            models.Subscription.user_id == user.id,
            models.Subscription.is_active == True,
            models.Subscription.category == 'OTT'
        ).all()
        print(f"DEBUG: Active Subs: {[s.service_name for s in subs]}")
        
        # Run Calculation
        print("\n--- Running Calculation ---")
        recs = recommendations.calculate_dashboard_recommendations(db, user.id)
        
        # Analyze Results
        trending = [r for r in recs if r["type"] == "trending"]
        watch_now = [r for r in recs if r["type"] == "watch_now"]
        
        print(f"\nDEBUG: Total Recs: {len(recs)}")
        print(f"DEBUG: 'Watch Now' Items: {len(watch_now)}")
        print(f"DEBUG: 'Trending' Items: {len(trending)}")
        
        if len(trending) == 0:
            print("\nERROR: No Trending Items found!")
            # Retracing steps...
            
    except Exception as e:
        print(f"EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_dashboard()
