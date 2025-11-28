from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime

class SubscriptionBase(BaseModel):
    service_name: str
    cost: float
    currency: str = "USD"
    billing_cycle: str
    start_date: date
    next_billing_date: date
    is_active: bool = True

class SubscriptionCreate(SubscriptionBase):
    pass

class Subscription(SubscriptionBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class WatchlistItemBase(BaseModel):
    tmdb_id: int
    title: str
    media_type: str
    poster_path: Optional[str] = None
    status: str = "plan_to_watch"

class WatchlistItemCreate(WatchlistItemBase):
    pass

class WatchlistItem(WatchlistItemBase):
    id: int
    user_id: int
    status: str
    added_at: datetime

    class Config:
        from_attributes = True

class PlanBase(BaseModel):
    name: str
    cost: float
    currency: str

class Plan(PlanBase):
    id: int
    service_id: int

    class Config:
        from_attributes = True

class ServiceBase(BaseModel):
    name: str
    logo_url: Optional[str] = None

class Service(ServiceBase):
    id: int
    plans: List[Plan] = []

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: str
    country: str = "US"

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    subscriptions: List[Subscription] = []
    watchlist: List[WatchlistItem] = []

    class Config:
        from_attributes = True
