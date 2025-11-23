from sqlalchemy.orm import Session
import models, schemas

def get_recommendations(db: Session, user_id: int):
    # Mock logic: Suggest services based on random assignment or hardcoded for now
    # In a real app, we would check which service has the movies in the watchlist
    
    watchlist = db.query(models.WatchlistItem).filter(models.WatchlistItem.user_id == user_id).all()
    if not watchlist:
        return []
    
    # Mock recommendation
    return [
        {
            "service_name": "Netflix",
            "reason": "Available: 3 items from your watchlist",
            "estimated_cost": 15.49
        },
        {
            "service_name": "Hulu",
            "reason": "Available: 1 item from your watchlist",
            "estimated_cost": 7.99
        }
    ]
