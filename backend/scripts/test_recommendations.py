from sqlalchemy.orm import Session
from database import SessionLocal
import models
import recommendations
import crud
import schemas

def test_recommendations():
    db = SessionLocal()
    try:
        # 1. Get a test user (or create one)
        user = crud.get_user_by_email(db, "test@example.com")
        if not user:
            print("Creating test user...")
            user = crud.create_user(db, schemas.UserCreate(email="test@example.com", password="password"))
        
        print(f"Testing for User ID: {user.id}")

        # 2. Clear existing data for clean test
        db.query(models.WatchlistItem).filter(models.WatchlistItem.user_id == user.id).delete()
        db.query(models.Subscription).filter(models.Subscription.user_id == user.id).delete()
        db.commit()

        # 3. Add "Breaking Bad" (TV, 1396) -> Should be on Netflix
        print("Adding 'Breaking Bad' to watchlist...")
        breaking_bad = schemas.WatchlistItemCreate(
            tmdb_id=1396,
            title="Breaking Bad",
            media_type="tv",
            poster_path=None
        )
        crud.create_watchlist_item(db, breaking_bad, user.id)

        # 4. Add "The Boys" (TV, 76479) -> Should be on Amazon Prime
        print("Adding 'The Boys' to watchlist...")
        the_boys = schemas.WatchlistItemCreate(
            tmdb_id=76479,
            title="The Boys",
            media_type="tv",
            poster_path=None
        )
        crud.create_watchlist_item(db, the_boys, user.id)

        # 5. Run Recommendations
        print("\n--- Running Recommendation Engine ---")
        recs = recommendations.get_recommendations(db, user.id)
        
        print("\n--- Results ---")
        for rec in recs:
            print(f"Service: {rec['service_name']}")
            print(f"Reason: {rec['reason']}")
            print(f"Cost: ${rec['estimated_cost']}")
            print("-" * 20)

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_recommendations()
