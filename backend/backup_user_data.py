"""
Backup script to preserve user data before any database schema changes.
Run this BEFORE making any schema migrations or database recreations.
"""
import json
from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal
import models

def backup_user_data(output_file: str = None):
    if output_file is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = f"user_data_backup_{timestamp}.json"
    
    db = SessionLocal()
    backup_data = {
        "backup_timestamp": datetime.now().isoformat(),
        "users": [],
        "subscriptions": [],
        "watchlist_items": [],
        "user_interests": []
    }
    
    try:
        # Backup users
        users = db.query(models.User).all()
        for user in users:
            backup_data["users"].append({
                "email": user.email,
                "hashed_password": user.hashed_password,
                "is_active": user.is_active,
                "country": user.country
            })
        
        # Backup subscriptions
        subscriptions = db.query(models.Subscription).all()
        for sub in subscriptions:
            backup_data["subscriptions"].append({
                "user_email": db.query(models.User).filter(models.User.id == sub.user_id).first().email,
                "service_name": sub.service_name,
                "cost": sub.cost,
                "currency": sub.currency,
                "billing_cycle": sub.billing_cycle,
                "start_date": sub.start_date.isoformat(),
                "next_billing_date": sub.next_billing_date.isoformat(),
                "is_active": sub.is_active
            })
        
        # Backup watchlist items
        watchlist = db.query(models.WatchlistItem).all()
        for item in watchlist:
            backup_data["watchlist_items"].append({
                "user_email": db.query(models.User).filter(models.User.id == item.user_id).first().email,
                "tmdb_id": item.tmdb_id,
                "title": item.title,
                "media_type": item.media_type,
                "poster_path": item.poster_path,
                "vote_average": item.vote_average,
                "overview": item.overview,
                "user_rating": item.user_rating,
                "genre_ids": item.genre_ids,
                "status": item.status
            })
        
        # Backup user interests
        interests = db.query(models.UserInterest).all()
        for interest in interests:
            backup_data["user_interests"].append({
                "user_email": db.query(models.User).filter(models.User.id == interest.user_id).first().email,
                "genre_id": interest.genre_id,
                "score": interest.score
            })
        
        # Write to file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Backup completed successfully!")
        print(f"📁 File: {output_file}")
        print(f"👥 Users: {len(backup_data['users'])}")
        print(f"📺 Subscriptions: {len(backup_data['subscriptions'])}")
        print(f"🎬 Watchlist items: {len(backup_data['watchlist_items'])}")
        print(f"⭐ User interests: {len(backup_data['user_interests'])}")
        
        return output_file
        
    except Exception as e:
        print(f"❌ Error during backup: {e}")
        return None
    finally:
        db.close()

if __name__ == "__main__":
    backup_user_data()
