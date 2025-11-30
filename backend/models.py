from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    country = Column(String, default="US")

    subscriptions = relationship("Subscription", back_populates="owner")
    watchlist = relationship("WatchlistItem", back_populates="owner")

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    service_name = Column(String, index=True)
    cost = Column(Float)
    currency = Column(String, default="USD")
    billing_cycle = Column(String) # monthly, yearly
    start_date = Column(Date)
    next_billing_date = Column(Date)
    is_active = Column(Boolean, default=True)

    owner = relationship("User", back_populates="subscriptions")

class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    tmdb_id = Column(Integer)
    title = Column(String)
    media_type = Column(String) # movie, tv
    poster_path = Column(String, nullable=True)
    status = Column(String, default="plan_to_watch") # plan_to_watch, watching, watched
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="watchlist")


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    base_cost = Column(Float)
    logo_url = Column(String, nullable=True)
    
    plans = relationship("Plan", back_populates="service")

class RecommendationCache(Base):
    __tablename__ = "recommendation_cache"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    category = Column(String, index=True) # "dashboard", "similar"
    data = Column(String) # JSON string
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User")

class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id"))
    name = Column(String) # Basic, Standard, Premium
    cost = Column(Float)
    currency = Column(String, default="USD")
    
    service = relationship("Service", back_populates="plans")
