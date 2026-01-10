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
    category: str = "OTT"

class SubscriptionCreate(SubscriptionBase):
    pass

class SubscriptionUpdate(BaseModel):
    service_name: Optional[str] = None
    cost: Optional[float] = None
    currency: Optional[str] = None
    billing_cycle: Optional[str] = None
    start_date: Optional[date] = None
    next_billing_date: Optional[date] = None
    is_active: Optional[bool] = None
    category: Optional[str] = None

class Subscription(SubscriptionBase):
    id: int
    user_id: int
    logo_url: Optional[str] = None

    class Config:
        from_attributes = True

class WatchlistItemBase(BaseModel):
    tmdb_id: int
    title: str
    media_type: str
    poster_path: Optional[str] = None
    vote_average: Optional[float] = None
    overview: Optional[str] = None
    status: str = "plan_to_watch"
    user_rating: Optional[int] = None # 1-10
    available_on: Optional[str] = None # Enriched field for UI badges

class WatchlistRatingUpdate(BaseModel):
    rating: int

class WatchlistProgressUpdate(BaseModel):
    current_season: int
    current_episode: int

class WatchlistItemCreate(WatchlistItemBase):
    genre_ids: Optional[List[int]] = None
    total_seasons: Optional[int] = 0
    total_episodes: Optional[int] = 0

class WatchlistItem(WatchlistItemBase):
    id: int
    user_id: int
    status: str
    added_at: datetime
    genre_ids: Optional[str] = None # Stored as string
    
    current_season: Optional[int] = 0
    current_episode: Optional[int] = 0
    total_seasons: Optional[int] = 0
    total_episodes: Optional[int] = 0

    class Config:
        from_attributes = True

class PlanBase(BaseModel):
    name: str
    cost: float
    currency: str
    billing_cycle: str = "monthly"
    country: str = "US"

class Plan(PlanBase):
    id: int
    service_id: int

    class Config:
        from_attributes = True

class ServiceBase(BaseModel):
    name: str
    logo_url: Optional[str] = None
    country: str = "US"
    category: str = "OTT"

class Service(ServiceBase):
    id: int
    plans: List[Plan] = []

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: str
    country: str = "IN"

class UserCreate(UserBase):
    password: str


class UserPreferences(BaseModel):
    target_budget: Optional[int] = None
    target_currency: Optional[str] = "USD" # New: Store currency context
    watch_time_weekly: Optional[int] = None
    household_size: Optional[str] = None # Solo, Couple, Family
    languages: Optional[List[str]] = None # New: English, Hindi, etc.
    viewing_style: Optional[str] = None # New: Binge, Weekly, Casual
    devices: Optional[List[str]] = None
    deal_breakers: Optional[List[str]] = None

class User(UserBase):
    id: int
    is_active: bool
    preferences: Optional[str] = None # JSON string
    ai_allowed: bool
    ai_access_status: Optional[str] = "none"
    last_ai_usage: Optional[datetime] = None
    subscriptions: List[Subscription] = []
    watchlist: List[WatchlistItem] = []

    class Config:
        from_attributes = True

class AIRecommendation(BaseModel):
    title: str
    reason: str
    service: str
    tmdb_id: Optional[int] = None
    media_type: Optional[str] = "movie"
    poster_path: Optional[str] = None
    vote_average: Optional[float] = None
    overview: Optional[str] = None
    logo_url: Optional[str] = None

class AIStrategyItem(BaseModel):
    action: str # "Cancel", "Add", "Keep"
    service: str
    reason: str
    savings: Optional[float] = None

class AIGapItem(BaseModel):
    title: str
    service: str
    reason: str
    tmdb_id: Optional[int] = None
    media_type: Optional[str] = "movie"
    poster_path: Optional[str] = None

class AIUnifiedResponse(BaseModel):
    picks: List[AIRecommendation]
    strategy: List[AIStrategyItem]
    gaps: List[AIGapItem]
    warning: Optional[str] = None # To convey limits or stale data info

class TopService(BaseModel):
    name: str
    cost: float
    currency: str = "USD"

class UserStats(BaseModel):
    total_cost: float
    active_subs: int
    yearly_projection: float
    top_service: Optional[TopService] = None

class SpendingCategory(BaseModel):
    name: str
    cost: float
    color: str

