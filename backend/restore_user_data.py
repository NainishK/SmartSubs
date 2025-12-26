"""
Restore script to reload user data after database schema changes.
Run this AFTER recreating the database and seeding service data.
"""
import json
import sys
from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal
import models

def restore_user_data(backup_file: str):
    db = SessionLocal()
    
    try:
        # Load backup data
        with open(backup_file, 'r', encoding='utf-8') as f:
            backup_data = json.load(f)
        
        print(f"📂 Loading backup from: {backup_file}")
        print(f"🕐 Backup timestamp: {backup_data['backup_timestamp']}")
        
        # Restore users first
        user_id_map = {}  # Map old email to new user ID
        for user_data in backup_data["users"]:
            existing_user = db.query(models.User).filter(models.User.email == user_data["email"]).first()
            if existing_user:
                print(f"ℹ️  User {user_data['email']} already exists, skipping...")
                user_id_map[user_data["email"]] = existing_user.id
                continue
            
            user = models.User(
                email=user_data["email"],
                hashed_password=user_data["hashed_password"],
                is_active=user_data["is_active"],
                country=user_data.get("country", "US")
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            user_id_map[user_data["email"]] = user.id
            print(f"✅ Restored user: {user.email}")
        
        # Restore subscriptions
        for sub_data in backup_data["subscriptions"]:
            user_id = user_id_map.get(sub_data["user_email"])
            if not user_id:
                print(f"⚠️  User {sub_data['user_email']} not found, skipping subscription...")
                continue
            
            subscription = models.Subscription(
                user_id=user_id,
                service_name=sub_data["service_name"],
                cost=sub_data["cost"],
                currency=sub_data["currency"],
                billing_cycle=sub_data["billing_cycle"],
                start_date=datetime.fromisoformat(sub_data["start_date"]).date(),
                next_billing_date=datetime.fromisoformat(sub_data["next_billing_date"]).date(),
                is_active=sub_data["is_active"]
            )
            db.add(subscription)
        
        db.commit()
        print(f"✅ Restored {len(backup_data['subscriptions'])} subscriptions")
        
        # Restore watchlist items
        for item_data in backup_data["watchlist_items"]:
            user_id = user_id_map.get(item_data["user_email"])
            if not user_id:
                print(f"⚠️  User {item_data['user_email']} not found, skipping watchlist item...")
                continue
            
            watchlist_item = models.WatchlistItem(
                user_id=user_id,
                tmdb_id=item_data["tmdb_id"],
                title=item_data["title"],
                media_type=item_data["media_type"],
                poster_path=item_data.get("poster_path"),
                vote_average=item_data.get("vote_average"),
                overview=item_data.get("overview"),
                user_rating=item_data.get("user_rating"),
                genre_ids=item_data.get("genre_ids"),
                status=item_data["status"]
            )
            db.add(watchlist_item)
        
        db.commit()
        print(f"✅ Restored {len(backup_data['watchlist_items'])} watchlist items")
        
        # Restore user interests
        for interest_data in backup_data["user_interests"]:
            user_id = user_id_map.get(interest_data["user_email"])
            if not user_id:
                continue
            
            interest = models.UserInterest(
                user_id=user_id,
                genre_id=interest_data["genre_id"],
                score=interest_data["score"]
            )
            db.add(interest)
        
        db.commit()
        print(f"✅ Restored {len(backup_data['user_interests'])} user interests")
        
        print("\n🎉 Data restoration completed successfully!")
        
    except FileNotFoundError:
        print(f"❌ Backup file not found: {backup_file}")
    except Exception as e:
        print(f"❌ Error during restoration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python restore_user_data.py <backup_file.json>")
        print("\nAvailable backups:")
        import os
        backups = [f for f in os.listdir('.') if f.startswith('user_data_backup_') and f.endswith('.json')]
        for backup in sorted(backups, reverse=True):
            print(f"  - {backup}")
        sys.exit(1)
    
    restore_user_data(sys.argv[1])
