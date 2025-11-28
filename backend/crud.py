from sqlalchemy.orm import Session
import models, schemas, security

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_subscriptions(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Subscription).offset(skip).limit(limit).all()

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

def get_watchlist(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.WatchlistItem).filter(models.WatchlistItem.user_id == user_id).offset(skip).limit(limit).all()

def create_watchlist_item(db: Session, item: schemas.WatchlistItemCreate, user_id: int):
    # Check for duplicate
    existing_item = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.user_id == user_id,
        models.WatchlistItem.tmdb_id == item.tmdb_id
    ).first()
    if existing_item:
        return existing_item

    db_item = models.WatchlistItem(**item.dict(), user_id=user_id)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def delete_watchlist_item(db: Session, item_id: int, user_id: int):
    db_item = db.query(models.WatchlistItem).filter(models.WatchlistItem.id == item_id, models.WatchlistItem.user_id == user_id).first()
    if db_item:
        db.delete(db_item)
        db.commit()
    return db_item

def get_services(db: Session):
    return db.query(models.Service).all()

def get_plans(db: Session, service_id: int):
    return db.query(models.Plan).filter(models.Plan.service_id == service_id).all()

def update_user_profile(db: Session, user_id: int, country: str):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        user.country = country
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
