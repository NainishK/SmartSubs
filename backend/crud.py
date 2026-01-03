from sqlalchemy.orm import Session
from sqlalchemy.sql import func
import models, schemas, security

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password, country=user.country)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_subscriptions(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Subscription).offset(skip).limit(limit).all()

def get_user_subscriptions(db: Session, user_id: int):
    return db.query(models.Subscription).filter(
        models.Subscription.user_id == user_id,
        models.Subscription.is_active == True
    ).all()

def create_user_subscription(db: Session, subscription: schemas.SubscriptionCreate, user_id: int):
    # Check for duplicate
    existing_sub = db.query(models.Subscription).filter(
        models.Subscription.user_id == user_id,
        models.Subscription.service_name == subscription.service_name
    ).first()
    if existing_sub:
        return existing_sub
        
    db_subscription = models.Subscription(**subscription.dict(), user_id=user_id)
    db.add(db_subscription)
    db.commit()
    db.refresh(db_subscription)
    return db_subscription

def delete_subscription(db: Session, subscription_id: int, user_id: int):
    db_sub = db.query(models.Subscription).filter(models.Subscription.id == subscription_id, models.Subscription.user_id == user_id).first()
    if db_sub:
        db.delete(db_sub)
        db.commit()
    return db_sub

def update_subscription(db: Session, subscription_id: int, subscription: schemas.SubscriptionUpdate, user_id: int):
    db_sub = db.query(models.Subscription).filter(models.Subscription.id == subscription_id, models.Subscription.user_id == user_id).first()
    if db_sub:
        for var, value in subscription.dict(exclude_unset=True).items():
            setattr(db_sub, var, value)
        db.commit()
        db.refresh(db_sub)
    return db_sub

def get_watchlist(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.WatchlistItem).filter(models.WatchlistItem.user_id == user_id).offset(skip).limit(limit).all()

import json

def update_interests(db: Session, user_id: int, genre_ids: list, delta: int):
    """Update score for user interests."""
    if not genre_ids:
        return
    
    for genre_id in genre_ids:
        interest = db.query(models.UserInterest).filter(
            models.UserInterest.user_id == user_id,
            models.UserInterest.genre_id == genre_id
        ).first()
        
        if interest:
            interest.score += delta
        else:
            # Only create if positive delta (don't create negative interest for new genre)
            if delta > 0:
                interest = models.UserInterest(user_id=user_id, genre_id=genre_id, score=delta)
                db.add(interest)
    db.commit()

def create_watchlist_item(db: Session, item: schemas.WatchlistItemCreate, user_id: int):
    # Check for duplicate
    existing_item = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.user_id == user_id,
        models.WatchlistItem.tmdb_id == item.tmdb_id
    ).first()
    if existing_item:
        return existing_item

    # Prepare data
    item_data = item.dict()
    genre_ids_list = item_data.pop('genre_ids', [])
    
    # If genres not provided, try to fetch them? 
    # For now assume frontend sends them or we verify later.
    # Store as string
    genre_ids_str = json.dumps(genre_ids_list) if genre_ids_list else None
    
    db_item = models.WatchlistItem(**item_data, genre_ids=genre_ids_str, user_id=user_id)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    # Update User Interests (+1 for adding)
    if genre_ids_list:
        update_interests(db, user_id, genre_ids_list, 1)
        
    return db_item

def delete_watchlist_item(db: Session, item_id: int, user_id: int):
    db_item = db.query(models.WatchlistItem).filter(models.WatchlistItem.id == item_id, models.WatchlistItem.user_id == user_id).first()
    if db_item:
        # Decrement interest logic
        if db_item.genre_ids:
            try:
                g_ids = json.loads(db_item.genre_ids)
                update_interests(db, user_id, g_ids, -1)
            except:
                pass
                
        db.delete(db_item)
        db.commit()
    return db_item

def update_watchlist_item_rating(db: Session, item_id: int, user_id: int, rating: int):
    db_item = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.id == item_id, 
        models.WatchlistItem.user_id == user_id
    ).first()
    
    if db_item:
        if db_item.genre_ids:
            old_rating = db_item.user_rating or 0
            diff = rating - old_rating
            
            # Simple Logic: 
            # Rate 5 (New): +3. 
            # Rate 1 (New): -2.
            
            # To handle *changes*, we calculate delta score
            def get_score_impact(r):
                if r >= 9: return 3   # 5 stars (9-10)
                if r >= 7: return 1   # 4 stars (7-8)
                if r <= 2: return -3  # 1 star (1-2)
                if r <= 4: return -1  # 2 stars (3-4)
                return 0              # 3 stars (5-6)
                
            score_change = get_score_impact(rating) - get_score_impact(old_rating)
            
            if score_change != 0:
                try:
                    g_ids = json.loads(db_item.genre_ids)
                    update_interests(db, user_id, g_ids, score_change)
                except:
                    pass

        db_item.user_rating = rating
        db.commit()
        db.refresh(db_item)
        
    return db_item

def get_services(db: Session, country: str = "US"):
    return db.query(models.Service).filter(
        models.Service.country == country
    ).all()

def get_plans(db: Session, service_id: int, country: str = "US"):
    return db.query(models.Plan).filter(
        models.Plan.service_id == service_id,
        models.Plan.country == country
    ).all()

def update_user_profile(db: Session, user_id: int, country: str):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        user.country = country
        db.commit()
        db.refresh(user)
    return user

def update_user_preferences(db: Session, user_id: int, preferences: schemas.UserPreferences):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        # Convert pydantic model to json string
        user.preferences = preferences.json()
        db.commit()
        db.refresh(user)
    return user

def update_watchlist_item_status(db: Session, item_id: int, user_id: int, status: str):
    db_item = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.id == item_id, 
        models.WatchlistItem.user_id == user_id
    ).first()
    if db_item:
        db_item.status = status
        db.commit()
        db.refresh(db_item)
    return db_item

def update_user_ai_usage(db: Session, user_id: int):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        # Reset count if it's a new day/period (handled by logic or just naive check here)
        # We'll trust logic did the check, but here we just increment
        # Actually, let's reset here if needed to be safe, or just increment?
        # Let's just increment and timestamp. Logic in main.py decides whether to reset FIRST.
        # Wait, if main logic sees "It's a new day", it should reset.
        
        # Simple approach: validate_ai_access handles the "Reset if new day".
        # This function just "Marks usage".
        user.last_ai_usage = func.now()
        user.ai_usage_count = (user.ai_usage_count or 0) + 1
        db.commit()
