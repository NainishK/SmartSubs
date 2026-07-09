from fastapi import FastAPI, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta
import models, schemas, crud, security, dependencies
from database import SessionLocal, engine
import traceback
import time
from logger import logger # [NEW]

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Include Routers
from routers import auth
app.include_router(auth.router)

# [NEW] Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = (time.time() - start_time) * 1000
    formatted_process_time = "{0:.2f}".format(process_time)
    
    # Log: Method URL Status Time IP
    client_host = request.client.host if request.client else "unknown"
    
    log_msg = f"{request.method} {request.url.path} - {response.status_code} - {formatted_process_time}ms - {client_host}"
    
    if response.status_code >= 500:
        logger.error(log_msg)
    elif response.status_code >= 400:
        logger.warning(log_msg)
    else:
        logger.info(log_msg)
        
    return response

# --- Admin Panel Setup ---
from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request
from starlette.responses import RedirectResponse
from models import User, Subscription, WatchlistItem

class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        username = form.get("username")
        password = form.get("password")
        
        # TODO: Connect this to a real "is_superuser" field in DB
        if username == "admin" and password == "admin123":
            request.session.update({"token": "admin_token"})
            return True
        return False

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        return "token" in request.session

authentication_backend = AdminAuth(secret_key="SUPER_SECRET_KEY")

class UserAdmin(ModelView, model=User):
    column_list = [User.id, User.email, User.ai_access_status, User.ai_allowed, User.country, User.is_active, User.ai_quota_policy, User.ai_usage_count]
    form_columns = [User.email, User.is_active, User.country, User.ai_allowed, User.ai_access_status, User.ai_quota_policy, User.ai_request_limit, User.ai_usage_count]
    can_create = False
    can_edit = True
    can_delete = True
    icon = "fa-solid fa-user"

class SubscriptionAdmin(ModelView, model=Subscription):
    column_list = [Subscription.service_name, Subscription.cost, Subscription.is_active]
    # Removed user_id temporarily to rule out FK resolution issues
    icon = "fa-solid fa-credit-card"

class WatchlistAdmin(ModelView, model=WatchlistItem):
    column_list = [WatchlistItem.title, WatchlistItem.media_type, WatchlistItem.user_id]
    icon = "fa-solid fa-tv"

admin = Admin(app, engine, authentication_backend=authentication_backend)
admin.add_view(UserAdmin)
admin.add_view(SubscriptionAdmin)
admin.add_view(WatchlistAdmin)
# -------------------------

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = "".join(traceback.format_exception(None, exc, exc.__traceback__))
    logger.error(f"Global Exception: {error_msg}") # [MODIFIED]
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "details": str(exc)},
    )

origins = [
    "*",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

from starlette.middleware.sessions import SessionMiddleware

from config import settings
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY, https_only=False, same_site="lax", session_cookie="bingesensei_session")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ─────────────────────────────────────────────
# PUBLIC ENDPOINTS (no auth required)
# Used by the landing page for unauthenticated visitors
# ─────────────────────────────────────────────

import tmdb_client as tmdb_client_module

GENRE_MAP = {
    "action": "28",
    "comedy": "35",
    "drama": "18",
    "scifi": "878",
    "thriller": "53",
    "anime": "16",  # animation genre, filtered by language on frontend
    "horror": "27",
}

def _format_providers(providers_raw: dict) -> list:
    """Extract flatrate (streaming) providers into a clean list."""
    flatrate = providers_raw.get("flatrate", [])
    return [
        {"name": p.get("provider_name"), "logo": p.get("logo_path")}
        for p in flatrate[:5]
    ]

@app.get("/public/trending")
def public_trending(region: str = "US", genre: str = None):
    """
    Returns top trending movies and TV shows for the landing page.
    - "All" tab: uses TMDB /trending/week (genuinely trending this week)
    - "Anime" tab: uses discover filtered to current season + Japanese language
    - Other genre tabs: uses discover sorted by popularity
    No authentication required.
    """
    from datetime import datetime

    region = region.upper() if region else "US"
    genre_lower = genre.lower() if genre else ""
    genre_id = GENRE_MAP.get(genre_lower) if genre_lower else None

    def _build_item(item, media_type):
        tmdb_id = item.get("id")
        providers_raw = tmdb_client_module.get_watch_providers(media_type, tmdb_id, region=region)
        return {
            "id": tmdb_id,
            "media_type": media_type,
            "title": item.get("title") or item.get("name"),
            "poster_path": item.get("poster_path"),
            "backdrop_path": item.get("backdrop_path"),
            "vote_average": item.get("vote_average"),
            "overview": item.get("overview"),
            "genre_ids": item.get("genre_ids", []),
            "original_language": item.get("original_language"),
            "release_date": item.get("release_date") or item.get("first_air_date"),
            "providers": _format_providers(providers_raw),
        }

    results = []

    if not genre_lower:
        # "All" tab: genuinely trending this week via TMDB /trending endpoint
        for media_type in ["movie", "tv"]:
            data = tmdb_client_module.get_trending(media_type, "week")
            for item in data.get("results", [])[:8]:
                results.append(_build_item(item, media_type))

    elif genre_lower == "anime":
        # Anime: only Japanese animation from the current airing season
        now = datetime.utcnow()
        season_starts = [1, 4, 7, 10]
        season_month = max(m for m in season_starts if m <= now.month)
        season_start_str = datetime(now.year, season_month, 1).strftime("%Y-%m-%d")

        # Currently airing TV anime this season
        tv_data = tmdb_client_module.discover_media(
            "tv",
            sort_by="popularity.desc",
            min_vote_count=20,
            with_genres="16",
            watch_region=region,
            with_original_language="ja",
            extra_params={"first_air_date.gte": season_start_str},
        )
        for item in tv_data.get("results", [])[:10]:
            results.append(_build_item(item, "tv"))

        # Recent anime movies (last 12 months)
        year_ago = datetime(now.year - 1, now.month, 1).strftime("%Y-%m-%d")
        movie_data = tmdb_client_module.discover_media(
            "movie",
            sort_by="popularity.desc",
            min_vote_count=20,
            with_genres="16",
            watch_region=region,
            with_original_language="ja",
            extra_params={"primary_release_date.gte": year_ago},
        )
        for item in movie_data.get("results", [])[:6]:
            results.append(_build_item(item, "movie"))

    else:
        # Other genre tabs: fetch this week's trending, then filter by genre
        # This gives genuinely trending results rather than all-time popular
        for media_type in ["movie", "tv"]:
            trending_data = tmdb_client_module.get_trending(media_type, "week")
            for item in trending_data.get("results", []):
                if genre_id and genre_id not in [str(g) for g in item.get("genre_ids", [])]:
                    continue
                results.append(_build_item(item, media_type))
                if len(results) >= 16:
                    break

        # Fallback: if trending yielded too few for this genre, supplement with discover
        if len(results) < 6:
            for media_type in ["movie", "tv"]:
                data = tmdb_client_module.discover_media(
                    media_type,
                    sort_by="popularity.desc",
                    min_vote_count=300,
                    with_genres=genre_id,
                    watch_region=region,
                )
                for item in data.get("results", [])[:8]:
                    if not any(r["id"] == item.get("id") for r in results):
                        results.append(_build_item(item, media_type))


    results.sort(key=lambda x: x.get("vote_average") or 0, reverse=True)
    return results[:16]



@app.get("/public/search")
def public_search(q: str, region: str = "US"):
    """
    Search for movies and TV shows for the landing page.
    No authentication required.
    """
    if not q or len(q.strip()) < 2:
        return []

    region = region.upper() if region else "US"
    raw = tmdb_client_module.search_multi(q)
    results = []

    # Scan all 20 raw results so that people entries (who have no media_type 'movie'/'tv')
    # don't push popular shows like Daredevil off the visible list
    for item in raw.get("results", [])[:20]:
        media_type = item.get("media_type")
        if media_type not in ["movie", "tv"]:
            continue
        tmdb_id = item.get("id")
        providers_raw = tmdb_client_module.get_watch_providers(media_type, tmdb_id, region=region)
        results.append({
            "id": tmdb_id,
            "media_type": media_type,
            "title": item.get("title") or item.get("name"),
            "poster_path": item.get("poster_path"),
            "backdrop_path": item.get("backdrop_path"),
            "vote_average": item.get("vote_average"),
            "overview": item.get("overview"),
            "genre_ids": item.get("genre_ids", []),
            "original_language": item.get("original_language"),
            "release_date": item.get("release_date") or item.get("first_air_date"),
            "providers": _format_providers(providers_raw),
        })

    return results


def validate_ai_access(db: Session, user: models.User):
    if not user.ai_allowed:
        raise HTTPException(status_code=403, detail="AI access is disabled for your account.")
    
    if user.ai_quota_policy == "unlimited":
        return

    # Check for reset
    reset_needed = False
    now = datetime.utcnow()
    
    if user.last_ai_usage:
        last = user.last_ai_usage
        if last.tzinfo:
            last = last.replace(tzinfo=None)
            
        if user.ai_quota_policy == "daily":
             # If different day, reset
             if last.date() != now.date():
                 reset_needed = True
                 
        elif user.ai_quota_policy == "weekly":
             # If > 7 days or new week (simplified: just > 7 days since last usage? No, that's weird. 
             # Let's say: Reset if last usage was in a previous ISO week)
             # simpler: if (now - last).days >= 7 ? 
             # User asked for "once a week". 
             # Let's stick to "Rolling 7 days" or "Calendar Week"?
             # Simplest compliant implementation: If 7 days passed since last usage, we treat it as new period.
             # Wait, that means they can only use it once every 7 days.
             # Better: Reset if Monday? 
             # Let's stick to user's "Daily" request primarily. 
             # For weekly: Reset if > 7 days.
             if (now - last).days >= 7:
                 reset_needed = True

    if reset_needed:
        user.ai_usage_count = 0
        db.commit()
    
    # Check Limit
    current_count = user.ai_usage_count or 0
    limit = user.ai_request_limit or 1 # Default to 1 if null
    
    if current_count >= limit:
        period = "day" if user.ai_quota_policy == "daily" else "period"
        raise HTTPException(status_code=429, detail=f"AI limit reached ({limit}/{limit} per {period}). Upgrade for more.")

@app.on_event("startup")
async def startup_event():
    import os
    import migration # [NEW] Auto-migration
    
    url = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")
    logger.info(f"🚀 API STARTUP - DB URL: {url}")
    
    # Run Schema Migration (Add missing columns)
    try:
        migration.run_migration()
        logger.info("✅ Schema Migration Completed")
    except Exception as e:
        logger.error(f"❌ Schema Migration Failed: {e}")

@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    logger.info(f"👉 Signup Request for: {user.email}") # [MODIFIED]
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        logger.warning(f"❌ Duplicate Email Found: {user.email} (ID: {db_user.id})") # [MODIFIED]
        raise HTTPException(status_code=400, detail="Email already registered")
    logger.info(f"✅ Creating New User: {user.email}") # [MODIFIED]
    return crud.create_user(db=db, user=user)

@app.post("/token")
async def login_for_access_token(background_tasks: BackgroundTasks, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    # Trigger background recommendation refresh (smart refresh)
    import recommendations
    background_tasks.add_task(recommendations.refresh_recommendations, SessionLocal(), user.id, force=False)
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me/", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(dependencies.get_current_user)):
    return current_user

@app.put("/users/profile", response_model=schemas.User)
def update_profile(
    update: schemas.UserProfileUpdate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(dependencies.get_current_user)
):
    if update.country:
        crud.update_user_profile(db, user_id=current_user.id, country=update.country)
        
        # Reset budget preference to avoid currency mismatch AND persist old budget
        if current_user.preferences:
             import json
             try:
                 prefs = json.loads(current_user.preferences)
                 
                 # 1. Initialize regional store if needed
                 if "regional_profiles" not in prefs:
                     prefs["regional_profiles"] = {}
                 
                 # 2. Save SNAPSHOT of current profile to OLD country
                 old_country = current_user.country or "US"
                 
                 # Filter out internal keys to avoid recursion or bloating
                 profile_snapshot = {
                     k: v for k, v in prefs.items() 
                     if k not in ["regional_profiles", "regional_budgets", "ai_skip_counts"]
                 }
                 
                 if profile_snapshot:
                     prefs["regional_profiles"][old_country] = profile_snapshot
                 
                 # 3. Check NEW country
                 new_country = update.country
                 
                 # 4. Restore or Clear (NO INHERITANCE)
                 if new_country in prefs["regional_profiles"]:
                     saved_profile = prefs["regional_profiles"][new_country]
                     # Restore all saved fields
                     prefs.update(saved_profile)
                 else:
                     # NEW REGION = CLEAN SLATE
                     # We explicitly clear all preference fields except the regional stores
                     keys_to_keep = ["regional_profiles", "regional_budgets", "ai_skip_counts"]
                     keys_to_clear = [k for k in prefs.keys() if k not in keys_to_keep]
                     
                     for k in keys_to_clear:
                         del prefs[k]
                 
                 # Clean up legacy keys
                 if "budget" in prefs: del prefs["budget"]
                 if "regional_budgets" in prefs: del prefs["regional_budgets"] 

                 crud.update_user_preferences(db, user_id=current_user.id, preferences=json.dumps(prefs))
                 
             except Exception as e:
                 logger.error(f"Error in preference persistence: {e}")
                 pass

        # 2. Trigger background refresh to populate new cache (Region-keyed now, so no need to clear old)
        import recommendations
        background_tasks.add_task(recommendations.refresh_recommendations, SessionLocal(), current_user.id, force=True)
    
    if update.preferences:
        crud.update_user_preferences(db, user_id=current_user.id, preferences=update.preferences)
        
    # Re-fetch user to ensure we return the latest state without "not persistent" errors
    # (CRUD commits expire the previous session objects)
    updated_user = db.query(models.User).filter(models.User.id == current_user.id).first()
    return updated_user

@app.post("/users/me/access/ai")
async def request_ai_access(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    if current_user.ai_allowed or current_user.ai_access_status == 'approved':
        if not current_user.ai_allowed:
            # Self-repair: Admin set status text but forgot boolean
            user = db.query(models.User).filter(models.User.id == current_user.id).first()
            if user:
                user.ai_allowed = True
                db.commit()
                
        return {"status": "approved", "message": "You have been approved! Please refresh."}
    
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
         raise HTTPException(status_code=404, detail="User not found")
         
    user.ai_access_status = "requested"
    db.commit()
    db.refresh(user)
    return {"status": "requested", "message": "Access requested. Waiting for approval."}

@app.get("/users/me/stats", response_model=schemas.UserStats)
def read_user_stats(country: str = None, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    target_country = country if country else (current_user.country or "US")
    subs = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.is_active == True,
        models.Subscription.country == target_country
    ).all()
    
    def get_monthly_cost(sub):
        cost = sub.cost or 0.0
        if sub.billing_cycle and sub.billing_cycle.lower() == 'yearly':
            return cost / 12
        return cost

    total_cost = sum(get_monthly_cost(sub) for sub in subs) 
    yearly_projection = total_cost * 12
    
    top_service = None
    if subs:
        # Top Sub based on monthly impact
        top_sub = max(subs, key=lambda s: get_monthly_cost(s))
        top_service = schemas.TopService(name=top_sub.service_name, cost=get_monthly_cost(top_sub))
        
    return schemas.UserStats(
        total_cost=total_cost,
        active_subs=len(subs),
        yearly_projection=yearly_projection,
        top_service=top_service
    )

@app.get("/users/me/spending", response_model=list[schemas.SpendingCategory])
def read_user_spending(country: str = None, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    target_country = country if country else (current_user.country or "US")
    subs = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.is_active == True,
        models.Subscription.country == target_country
    ).all()
    
    def get_monthly_cost(sub):
        cost = sub.cost or 0.0
        if sub.billing_cycle and sub.billing_cycle.lower() == 'yearly':
            return cost / 12
        return cost

    # Sort by cost descending (monthly)
    sorted_subs = sorted(subs, key=lambda s: get_monthly_cost(s), reverse=True)
    
    # Top 3 + Others
    top_subs = sorted_subs[:3]
    other_subs = sorted_subs[3:]
    
    spending_dist = []
    colors = ['#0070f3', '#7928ca', '#f5a623', '#10b981']
    
    for i, sub in enumerate(top_subs):
        spending_dist.append(schemas.SpendingCategory(
            name=sub.service_name,
            cost=get_monthly_cost(sub),
            color=colors[i % len(colors)]
        ))
        
    if other_subs:
        other_cost = sum(get_monthly_cost(s) for s in other_subs)
        spending_dist.append(schemas.SpendingCategory(
            name='Others',
            cost=other_cost,
            color='#e0e0e0'
        ))
        
    return spending_dist

@app.get("/search")
def search_content(query: str, current_user: models.User = Depends(dependencies.get_current_user)):
    import tmdb_client
    return tmdb_client.search_multi(query)

@app.post("/subscriptions/", response_model=schemas.Subscription)
def create_subscription(subscription: schemas.SubscriptionCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    # Auto-assign country if not provided
    if not subscription.country:
        subscription.country = current_user.country or "US"
        
    sub = crud.create_user_subscription(db=db, subscription=subscription, user_id=current_user.id)
    
    # Attach logo
    service = db.query(models.Service).filter(
        models.Service.name == sub.service_name,
        (models.Service.country == sub.country) | (models.Service.country == "US")
    ).order_by(models.Service.country == sub.country).first()
    if service:
        sub.logo_url = service.logo_url

    # Trigger background refresh
    import recommendations
    background_tasks.add_task(recommendations.refresh_recommendations, SessionLocal(), current_user.id, force=True)
    
    return sub

@app.get("/subscriptions/", response_model=list[schemas.Subscription])
def read_subscriptions(country: str = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    # Default to user's country if not specified
    target_country = country if country else (current_user.country or "US")
    
    subs = crud.get_user_subscriptions(db, user_id=current_user.id, country=target_country)
    
    # Attach logos
    for sub in subs:
        # Use desc() to prioritize True (Match) over False
        service = db.query(models.Service).filter(
            models.Service.name == sub.service_name,
            (models.Service.country == sub.country) | (models.Service.country == "US")
        ).order_by(desc(models.Service.country == sub.country)).first()
        if service:
            sub.logo_url = service.logo_url
    return subs

@app.delete("/subscriptions/{subscription_id}", response_model=schemas.Subscription)
def delete_subscription(subscription_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    db_sub = crud.delete_subscription(db, subscription_id=subscription_id, user_id=current_user.id)
    if db_sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
        
    # Trigger background refresh
    import recommendations
    background_tasks.add_task(recommendations.refresh_recommendations, db, current_user.id, force=True)
    
    return db_sub

@app.put("/subscriptions/{subscription_id}", response_model=schemas.Subscription)
def update_subscription(subscription_id: int, subscription: schemas.SubscriptionUpdate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    db_sub = crud.update_subscription(db, subscription_id=subscription_id, subscription=subscription, user_id=current_user.id)
    if db_sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
        
    # Trigger background refresh
    import recommendations
    background_tasks.add_task(recommendations.refresh_recommendations, db, current_user.id, force=True)
    
    return db_sub

@app.post("/watchlist/", response_model=schemas.WatchlistItem)
def add_to_watchlist(
    item: schemas.WatchlistItemCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(dependencies.get_current_user)
):
    new_item = crud.create_watchlist_item(db=db, item=item, user_id=current_user.id)
    
    # Trigger recommendation refresh to update "Unused Subs" and "Watch Now"
    import recommendations
    background_tasks.add_task(recommendations.refresh_recommendations, SessionLocal(), current_user.id, force=True)
    
    return new_item

@app.get("/watchlist/", response_model=list[schemas.WatchlistItem])
def read_watchlist(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):

    # Optimized: Return raw list immediately. Enrichment happens via separate endpoint.
    return crud.get_watchlist(db, user_id=current_user.id, skip=skip, limit=limit)

@app.post("/watchlist/availability")
def check_watch_availability(item_ids: list[int], background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    import tmdb_client
    
    subs = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.is_active == True,
        models.Subscription.category == 'OTT',
        models.Subscription.country == (current_user.country or "US")
    ).all()
    
    # Robust Provider Map
    PROVIDER_IDS_MAP = {
        "netflix": "8",
        "hulu": "15", 
        "amazon prime video": "9",
        "disney plus": "337",
        "max": "384|312",
        "peacock": "386",
        "apple tv plus": "350",
        "apple tv+": "350",  # Added exact match for DB Name
        "paramount plus": "83|531",
        "crunchyroll": "283",
        "hotstar": "122",
        "disney+ hotstar": "122",
        "jiocinema": "220",
        "jiohotstar": "122|220"
    }
    
    availability_map = {}
    
    # Fetch actual watchlist items from the provided IDs
    items = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.id.in_(item_ids),
        models.WatchlistItem.user_id == current_user.id
    ).all()
    
    import concurrent.futures
    import time
    
    start_time = time.time()
    
    def check_item(item):
        try:
            providers = tmdb_client.get_watch_providers(item.media_type, item.tmdb_id, region=current_user.country or "US")
            matched_sub = None
            
            if "flatrate" in providers:
                for p in providers["flatrate"]:
                    p_name = p["provider_name"]
                    p_id = str(p["provider_id"])
                    
                    for sub in subs:
                        # 1. ID Match
                        s_key = sub.service_name.lower()
                        mapped_ids = []
                        if s_key in PROVIDER_IDS_MAP:
                            mapped_ids = PROVIDER_IDS_MAP[s_key].split("|")
                        else:
                            for k, v in PROVIDER_IDS_MAP.items():
                                if k in s_key or s_key in k:
                                    mapped_ids = v.split("|")
                                    break
                        
                        if p_id in mapped_ids:
                            matched_sub = sub.service_name
                            break
                        
                        # 2. Name Match
                        if sub.service_name.lower() in p_name.lower() or p_name.lower() in sub.service_name.lower():
                            matched_sub = sub.service_name
                            break
                    if matched_sub: break
            
            if matched_sub:
                return item.tmdb_id, matched_sub
        except Exception as e:
            print(f"Availability check failed for {item.tmdb_id}: {e}")
        return None, None

    # Parallel Execution (Optimization)
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(check_item, items))
    
    # Batch Update DB
    updates = 0
    for tmdb_id, matched_sub in results:
        if tmdb_id and matched_sub:
            availability_map[tmdb_id] = matched_sub
            # Find item and update
            for item in items:
                if item.tmdb_id == tmdb_id:
                    if item.available_on != matched_sub:
                         item.available_on = matched_sub
                         updates += 1
                    break
    
    if updates > 0:
        print(f"DEBUG: Persisting {updates} badge updates to DB")
        db.commit()
            
    print(f"DEBUG: Availability check took {time.time() - start_time:.2f}s for {len(items)} items")
            
    # Trigger refresh since availability changed (affecting "Unused Subs")
    import recommendations
    background_tasks.add_task(recommendations.refresh_recommendations, SessionLocal(), current_user.id, force=True)
    
    return availability_map

@app.delete("/watchlist/{item_id}", response_model=schemas.WatchlistItem)
def delete_watchlist_item(
    item_id: int, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(dependencies.get_current_user)
):
    db_item = crud.delete_watchlist_item(db, item_id=item_id, user_id=current_user.id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
        
    # Trigger refresh
    import recommendations
    background_tasks.add_task(recommendations.refresh_recommendations, SessionLocal(), current_user.id, force=True)
    
    return db_item

@app.put("/watchlist/{item_id}/status", response_model=schemas.WatchlistItem)
def update_watchlist_status(
    item_id: int, 
    status: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(dependencies.get_current_user)
):
    db_item = crud.update_watchlist_item_status(db, item_id=item_id, user_id=current_user.id, status=status)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    import recommendations
    recommendations.clear_user_cache(db, current_user.id)
    return db_item

@app.put("/watchlist/{item_id}/rating", response_model=schemas.WatchlistItem)
def update_watchlist_rating(
    item_id: int, 
    update: schemas.WatchlistRatingUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(dependencies.get_current_user)
):
    db_item = crud.update_watchlist_item_rating(db, item_id=item_id, user_id=current_user.id, rating=update.rating)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    import recommendations
    recommendations.clear_user_cache(db, current_user.id)
    return db_item

@app.put("/watchlist/{item_id}/notes", response_model=schemas.WatchlistItem)
def update_watchlist_notes(
    item_id: int, 
    update: schemas.WatchlistNoteUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(dependencies.get_current_user)
):
    db_item = crud.update_watchlist_item_notes(db, item_id=item_id, user_id=current_user.id, notes=update.notes)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    import recommendations
    recommendations.clear_user_cache(db, current_user.id)
    return db_item

@app.put("/watchlist/{item_id}/progress", response_model=schemas.WatchlistItem)
def update_watchlist_progress(
    item_id: int, 
    update: schemas.WatchlistProgressUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(dependencies.get_current_user)
):
    db_item = crud.update_watchlist_item_progress(
        db, 
        item_id=item_id, 
        user_id=current_user.id, 
        current_season=update.current_season, 
        current_episode=update.current_episode
    )
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    import recommendations
    recommendations.clear_user_cache(db, current_user.id)
    return db_item

@app.get("/recommendations")
def get_recommendations(db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    """Legacy endpoint - returns fast recommendations only to avoid breaking changes"""
    import recommendations
    return recommendations.get_dashboard_recommendations(db, user_id=current_user.id)

@app.get("/recommendations/dashboard")
def get_dashboard_recommendations(db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    import recommendations
    return recommendations.get_dashboard_recommendations(db, user_id=current_user.id)

@app.get("/recommendations/similar")
def get_similar_recommendations(force_refresh: bool = False, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    import recommendations
    return recommendations.get_similar_content(db, user_id=current_user.id, force_refresh=force_refresh)

@app.post("/recommendations/refresh")
def refresh_recommendations_endpoint(type: str = None, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    """Force refresh recommendations synchronously"""
    import recommendations
    recommendations.refresh_recommendations(db, user_id=current_user.id, force=True, category=type)
    return {"message": "Recommendations refreshed"}






@app.post("/recommendations/insights", response_model=schemas.AIUnifiedResponse)

def get_unified_insights(
    force_refresh: bool = False,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(dependencies.get_current_user)
):
    """Generate comprehensive AI insights (Picks, Strategy, Gaps)"""
    import ai_client
    import crud
    import json
    
    # Check cache first? (Optional - lets do fresh for now or cache with 24h expiry)
    import recommendations
    if current_user.subscriptions and not force_refresh: 
         # Using a distinct category for this unified blob, now keyed by country
         country = current_user.country or "US"
         cache_key = f"unified_insights_{country}"
         print(f"DEBUG: Checking cache for user {current_user.id} with key: {cache_key}")
         cached = recommendations.get_cached_data(db, user_id=current_user.id, category=cache_key)
         
         if cached:
             print(f"DEBUG: Cache HIT for {cache_key}. Keys: {cached.keys()}")
         else:
             print(f"DEBUG: Cache MISS for {cache_key}")

         if cached and (cached.get('picks') or cached.get('strategy')):
             # Validate and filter bad items, but keep good ones (Partial Cache Strategy)
             valid_picks = []
             if cached.get('picks'):
                 for pick in cached['picks']:
                     if pick.get('tmdb_id') and pick.get('tmdb_id') != 0 and pick.get('poster_path'):
                         valid_picks.append(pick)
             
             # If we have at least some valid picks OR valid strategy, return cached
             has_picks = len(valid_picks) > 0
             has_strategy = cached.get('strategy') and len(cached.get('strategy')) > 0
             
             if has_picks or has_strategy:
                 cached['picks'] = valid_picks
                 
                 # Enrich Strategy Items in Cache Hit
                 if "strategy" in cached:
                     billing_map = {s.service_name.lower().strip(): s.billing_cycle.lower().strip() for s in current_user.subscriptions}
                     for strat in cached["strategy"]:
                         service_name = strat.get("service", "").lower().strip()
                         billing_cycle = billing_map.get(service_name, "monthly")
                         strat["billing_cycle"] = "yearly" if "year" in billing_cycle or "annual" in billing_cycle else "monthly"
                 return cached

    # 1. Check Permissions (Only if we need to generate)
    try:
        validate_ai_access(db, current_user)
    except HTTPException as e:
        if e.status_code == 429:
             # LIMIT REACHED: Try to fallback to ANY cache (even if we thought it was 'bad' or 'old')
             # Re-fetch raw cache just in case we filtered it out above
             country = current_user.country or "US"
             fallback = recommendations.get_cached_data(db, user_id=current_user.id, category=f"unified_insights_{country}")
             
             # If we have cache, use it
             if fallback and (fallback.get('picks') or fallback.get('strategy')):
                 fallback['warning'] = "Daily AI limit reached. Viewing cached results from last compliant generation."
                 return fallback
                 
             # IF NO CACHE and LIMIT REACHED:
             # Do not fail. Generate "Cheap" recommendations (Trending/Watch Now) deterministically.
             # This avoids the "Empty Screen of Death" for new users who hit limits immediately.
             manual_picks = recommendations.get_dashboard_recommendations(db, user_id=current_user.id)
             return {
                 "picks": manual_picks or [],
                 "strategy": [],
                 "gaps": [],
                 "warning": "Daily AI limit reached. Showing trending titles available on your services."
             }
        raise e

    # Gather Context
    watchlist = crud.get_watchlist(db, user_id=current_user.id, limit=100)
    subs = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.is_active == True,
        models.Subscription.category == 'OTT'
    ).all()
    
    # Parse Preferences
    preferences = {}
    if current_user.preferences:
        try:
            preferences = json.loads(current_user.preferences)
        except:
            pass
            
    # Format Data
    history = [{"title": w.title, "status": w.status} for w in watchlist]
    ratings = [{"title": w.title, "rating": w.user_rating} for w in watchlist if w.user_rating]
    active_subs = [
        {
            "name": s.service_name,
            "cost": s.cost,
            "billing": s.billing_cycle,
             "currency": s.currency
        } for s in subs
    ]
    
    # 2. Extract Negative Context
    dropped_history = [
        {"title": w.title} for w in watchlist 
        if w.status == 'dropped' or (w.user_rating and w.user_rating <= 4)
    ]
    deal_breakers = preferences.get("deal_breakers", [])
    
    # 3. Extract Watchlist IDs for Hard Filtering & Skip Tracking
    watchlist_ids = {w.tmdb_id for w in watchlist}
    
    # 4. Handle "ignored/repetitive" recommendations Logic
    # We load old cache -> see if user ignored them -> increment count
    import recommendations
    country = current_user.country or "US"
    old_cache = recommendations.get_cached_data(db, user_id=current_user.id, category=f"unified_insights_{country}")
    
    ignored_counts = preferences.get("ai_skip_counts", {})
    dirty_pref = False
    
    # DEBUG SKIP removed to keep logs clean
    print(f"DEBUG: Processing {len(old_cache.get('picks', [])) if old_cache else 0} cached items for skips.")
    
    
    
    if old_cache and old_cache.get("picks"):
        for pick in old_cache["picks"]:
            pid = str(pick.get("tmdb_id")) # JSON keys are strings
            if not pid or pid == "None": continue
            
            # If item was shown but NOT added to watchlist (i.e. skipped)
            if int(pid) not in watchlist_ids:
                curr_count = ignored_counts.get(pid, 0)
                ignored_counts[pid] = curr_count + 1
                dirty_pref = True
            else:
                # If they added it, reset count (it's no longer ignored)
                if pid in ignored_counts:
                    del ignored_counts[pid]
                    dirty_pref = True
                    
    if dirty_pref:
        # Update in-memory for the AI prompt, but DO NOT save to DB yet.
        # We only save if AI generation succeeds to avoid inflation during errors.
        preferences["ai_skip_counts"] = ignored_counts 

        
    # Determine which titles are "Soft Banned" (Ignored > 2 times)
    ignored_titles = []
    if old_cache and old_cache.get("picks"): # Only ban if we have history
         for pick in old_cache["picks"]:
             pid = str(pick.get("tmdb_id"))
             if pid in ignored_counts and ignored_counts[pid] >= 2:
                  ignored_titles.append(pick.get("title"))


    
    # Determine Currency
    currency = "INR" if current_user.country == "IN" else "USD"
    
    # Generate
    try:
        from google.api_core.exceptions import ResourceExhausted
        insights = ai_client.generate_unified_insights(
            user_history=history,
            user_ratings=ratings,
            active_subs=active_subs,
            preferences=preferences,
            dropped_history=dropped_history,
            deal_breakers=deal_breakers,
            ignored_titles=ignored_titles,
            ignored_ids={pid for pid, count in ignored_counts.items() if count >= 2},
            watchlist_ids=watchlist_ids,
            country=current_user.country,
            currency=currency
        )

    except Exception as e:
         error_str = str(e)
         # Catch Quota limits AND General Failure (All models used)
         is_quota = "429" in error_str or "quota" in error_str.lower() or "ResourceExhausted" in error_str or "AI Generation Failed" in error_str
         
         if is_quota:
             print(f"DEBUG: AI Service Unavailable (Quota/Error): {e}")
             
             # 1. Try Cache
             country = current_user.country or "US"
             fallback = recommendations.get_cached_data(db, user_id=current_user.id, category=f"unified_insights_{country}")
             if fallback and (fallback.get('picks') or fallback.get('strategy')):
                 fallback['warning'] = "AI is currently experiencing high demand. Viewing cached results from previous session."
                 return fallback
                 
             # 2. Return Unavailable State (Frontend will handle this)
             return {
                 "picks": [],
                 "strategy": [],
                 "gaps": [],
                 "warning": "AI_QUOTA_EXCEEDED"
             }
         
         # Reraise other errors
         print(f"ERROR: AI Generation Failed: {e}")
         raise e
    
    if not insights:
        # Return empty structure on failure
        return {"picks": [], "strategy": [], "gaps": []}

    # Enrich Strategy Items with their actual billing cycle from user subscriptions
    if "strategy" in insights:
        billing_map = {s.service_name.lower().strip(): s.billing_cycle.lower().strip() for s in subs}
        for strat in insights["strategy"]:
            service_name = strat.get("service", "").lower().strip()
            billing_cycle = billing_map.get(service_name, "monthly")
            strat["billing_cycle"] = "yearly" if "year" in billing_cycle or "annual" in billing_cycle else "monthly"
        
    # Cache
    country = current_user.country or "US"
    recommendations.set_cached_data(db, user_id=current_user.id, category=f"unified_insights_{country}", data=insights)
    
    # SUCCESS: Now we save the skip counts (if any)
    if dirty_pref:
        current_user.preferences = json.dumps(preferences)
        db.merge(current_user)
        db.commit()
    
    # Update Usage (Admin Control)
    crud.update_user_ai_usage(db, current_user.id)
    
    return insights

@app.get("/subscriptions/coverage")
def get_subscription_coverage(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    """
    Returns a deterministic coverage breakdown of how well the user's active OTT
    subscriptions cover their watchlist. No AI, no external API calls.
    Uses cached available_on field + type-aware hour heuristics.
    """
    country = current_user.country or "US"

    # --- Fetch Data ---
    subs = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.is_active == True,
        models.Subscription.category == "OTT",
        models.Subscription.country == country
    ).all()

    watchlist = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.user_id == current_user.id
    ).all()

    # Attach logos to subs
    for sub in subs:
        service = db.query(models.Service).filter(
            models.Service.name == sub.service_name,
            (models.Service.country == sub.country) | (models.Service.country == "US")
        ).order_by(desc(models.Service.country == sub.country)).first()
        if service:
            sub.logo_url = service.logo_url

    total_watchlist = len(watchlist)

    # --- Content Classification ---
    def classify_item(item) -> str:
        genre_ids = item.genre_ids or ""
        is_animation = "16" in genre_ids
        is_japanese = item.original_language == "ja"
        if item.media_type == "movie":
            return "movie"
        elif is_japanese and is_animation:
            return "anime"
        elif item.media_type == "tv":
            return "tv"
        else:
            return "other"

    # --- Hour Estimation ---
    AVG_EPISODE_DURATION = {"movie": 120, "tv": 42, "anime": 22, "other": 42}
    DEFAULT_SERIES_EPISODES = {"tv": 40, "anime": 26, "other": 20}

    def estimate_hours(item, content_type: str) -> float:
        if content_type == "movie":
            return round(AVG_EPISODE_DURATION["movie"] / 60, 1)
        eps = item.total_episodes or 0
        seasons = item.total_seasons or 0
        if eps > 0:
            episode_count = eps
        elif seasons > 0:
            episode_count = seasons * 12
        else:
            episode_count = DEFAULT_SERIES_EPISODES.get(content_type, 20)
        return round((episode_count * AVG_EPISODE_DURATION[content_type]) / 60, 1)

    # Pre-classify all watchlist items
    classified = {}
    for item in watchlist:
        ct = classify_item(item)
        hrs = estimate_hours(item, ct)
        classified[item.id] = {"type": ct, "hours": hrs}

    # --- Per-Service Coverage Breakdown ---
    def get_monthly_cost(sub) -> float:
        cost = sub.cost or 0.0
        if sub.billing_cycle and sub.billing_cycle.lower() == "yearly":
            return round(cost / 12, 2)
        return cost

    services_data = []

    for sub in subs:
        monthly_cost = get_monthly_cost(sub)
        breakdown = {
            "movie":  {"count": 0, "est_hours": 0.0},
            "tv":     {"count": 0, "est_hours": 0.0},
            "anime":  {"count": 0, "est_hours": 0.0},
            "other":  {"count": 0, "est_hours": 0.0},
        }

        for item in watchlist:
            if not item.available_on:
                continue
            # Fuzzy match: service name contained in available_on or vice versa
            if (sub.service_name.lower() in item.available_on.lower() or
                    item.available_on.lower() in sub.service_name.lower()):
                ct = classified[item.id]["type"]
                hrs = classified[item.id]["hours"]
                breakdown[ct]["count"] += 1
                breakdown[ct]["est_hours"] = round(breakdown[ct]["est_hours"] + hrs, 1)

        total_covered = sum(v["count"] for v in breakdown.values())
        total_hours = round(sum(v["est_hours"] for v in breakdown.values()), 1)
        coverage_pct = round((total_covered / total_watchlist * 100) if total_watchlist > 0 else 0)
        type_count = sum(1 for v in breakdown.values() if v["count"] > 0)

        # Value Score: hours-primary, coverage secondary, capped at 100
        # Hours are the real measure of entertainment value — cap at 300h
        hour_score = min((total_hours / 300) * 55, 55)
        # Coverage % is secondary — max 25 pts (100% coverage = 25 pts)
        title_score = min(coverage_pct * 0.25, 25)
        # Variety bonus for services spanning multiple content types
        variety_bonus = 20 if type_count >= 2 else 0
        raw_utility = hour_score + title_score + variety_bonus  # max = 100

        cost_usd = monthly_cost / 83.0 if country == "IN" else monthly_cost
        cost_penalty = min(cost_usd * 1.5, 20.0)

        value_score = round(max(10, raw_utility - cost_penalty))

        cost_per_title = round(monthly_cost / total_covered, 2) if total_covered > 0 else None
        cost_per_hour = round(monthly_cost / total_hours, 2) if total_hours > 0 else None

        services_data.append({
            "name": sub.service_name,
            "cost": sub.cost or 0.0,
            "billing_cycle": sub.billing_cycle,
            "logo_url": getattr(sub, "logo_url", None),
            "coverage_pct": coverage_pct,
            "value_score": value_score,
            "type_count": type_count,
            "breakdown": breakdown,
            "total_covered": total_covered,
            "total_hours": total_hours,
            "cost_per_title": cost_per_title,
            "cost_per_hour": cost_per_hour,
        })

    # Sort by value_score descending
    services_data.sort(key=lambda s: s["value_score"], reverse=True)

    # --- Orphaned Titles (no available_on or no matching subscription) ---
    sub_names_lower = {s.service_name.lower() for s in subs}

    def is_covered_by_any_sub(item) -> bool:
        if not item.available_on:
            return False
        a = item.available_on.lower()
        return any(sn in a or a in sn for sn in sub_names_lower)

    orphaned = []
    for item in watchlist:
        if not is_covered_by_any_sub(item):
            ct = classified[item.id]["type"]
            # If available_on points to a service the user doesn't have, surface it as a suggestion
            suggested_service = None
            if item.available_on:
                suggested_service = item.available_on  # e.g. "Apple TV+" - user doesn't have it
            orphaned.append({
                "tmdb_id": item.tmdb_id,
                "dbId": item.id,
                "title": item.title,
                "media_type": item.media_type,
                "poster_path": item.poster_path,
                "vote_average": item.vote_average,
                "overview": item.overview,
                "status": item.status,
                "est_hours": classified[item.id]["hours"],
                "content_type": ct,
                "suggested_service": suggested_service,
                "original_language": item.original_language,
                "genre_ids": item.genre_ids,
            })

    # --- Suggested Services (unsubscribed services covering watchlist items) ---
    # Build a map: service_name -> { count, hours, titles, types, breakdown }
    from collections import defaultdict
    suggested_map = defaultdict(lambda: {
        "count": 0, "hours": 0.0, "titles": [], "types": set(),
        "breakdown": {
            "movie": {"count": 0, "est_hours": 0.0},
            "tv":    {"count": 0, "est_hours": 0.0},
            "anime": {"count": 0, "est_hours": 0.0},
            "other": {"count": 0, "est_hours": 0.0},
        }
    })

    subscribed_names_lower = {s.service_name.lower() for s in subs}

    for item in watchlist:
        if not item.available_on:
            continue
        raw_services = [s.strip() for s in item.available_on.split(",") if s.strip()]
        for svc_name in raw_services:
            svc_lower = svc_name.lower()
            if any(sub_n in svc_lower or svc_lower in sub_n for sub_n in subscribed_names_lower):
                continue
            ct = classified[item.id]["type"]
            hrs = classified[item.id]["hours"]
            suggested_map[svc_name]["count"] += 1
            suggested_map[svc_name]["hours"] = round(suggested_map[svc_name]["hours"] + hrs, 1)
            suggested_map[svc_name]["types"].add(ct)
            suggested_map[svc_name]["breakdown"][ct]["count"] += 1
            suggested_map[svc_name]["breakdown"][ct]["est_hours"] = round(
                suggested_map[svc_name]["breakdown"][ct]["est_hours"] + hrs, 1
            )
            if item.title not in suggested_map[svc_name]["titles"]:
                suggested_map[svc_name]["titles"].append(item.title)

    # Fetch logos and cheapest plan for suggested services
    suggested_services = []
    for svc_name, info in sorted(suggested_map.items(), key=lambda x: -x[1]["count"]):
        if info["count"] < 1:
            continue
        logo_url = None
        cheapest_plan = None
        service_record = db.query(models.Service).filter(
            models.Service.name == svc_name,
        ).order_by(
            # Prefer exact country match
            desc(models.Service.country == country)
        ).first()
        if service_record:
            logo_url = service_record.logo_url
            # Find the cheapest monthly-equivalent plan for this service in user's country
            plans = db.query(models.Plan).filter(
                models.Plan.service_id == service_record.id,
                models.Plan.country == country,
            ).all()
            if not plans:
                # Fallback to any country
                plans = db.query(models.Plan).filter(
                    models.Plan.service_id == service_record.id,
                ).all()
            if plans:
                def monthly_equiv(p):
                    return p.cost / 12 if p.billing_cycle and p.billing_cycle.lower() == "yearly" else p.cost
                best = min(plans, key=monthly_equiv)
                cheapest_plan = {
                    "cost": best.cost,
                    "currency": best.currency,
                    "billing_cycle": best.billing_cycle,
                }

        # Compute projected value score using same formula as active subscriptions
        s_coverage_pct = round((info["count"] / total_watchlist * 100) if total_watchlist > 0 else 0)
        s_total_hours = info["hours"]
        s_type_count = len(info["types"])
        s_hour_score = min((s_total_hours / 300) * 55, 55)
        s_title_score = min(s_coverage_pct * 0.25, 25)
        s_variety_bonus = 20 if s_type_count >= 2 else 0
        s_raw_utility = s_hour_score + s_title_score + s_variety_bonus
        s_monthly_cost = 0.0
        if cheapest_plan:
            s_monthly_cost = (cheapest_plan["cost"] / 12
                              if cheapest_plan["billing_cycle"] and cheapest_plan["billing_cycle"].lower() == "yearly"
                              else cheapest_plan["cost"])
        s_cost_usd = s_monthly_cost / 83.0 if country == "IN" else s_monthly_cost
        s_cost_penalty = min(s_cost_usd * 1.5, 20.0)
        s_value_score = round(max(10, s_raw_utility - s_cost_penalty))
        s_cost_per_title = round(s_monthly_cost / info["count"], 2) if info["count"] > 0 and s_monthly_cost > 0 else None
        s_cost_per_hour = round(s_monthly_cost / s_total_hours, 2) if s_total_hours > 0 and s_monthly_cost > 0 else None

        suggested_services.append({
            "name": svc_name,
            "logo_url": logo_url,
            "count": info["count"],
            "est_hours": info["hours"],
            "coverage_pct": s_coverage_pct,
            "breakdown": info["breakdown"],
            "titles": info["titles"][:5],
            "cheapest_plan": cheapest_plan,
            "value_score": s_value_score,
            "cost_per_title": s_cost_per_title,
            "cost_per_hour": s_cost_per_hour,
        })

    # --- Summary ---
    total_monthly_cost = round(sum(get_monthly_cost(s) for s in subs), 2)
    total_covered = sum(
        1 for item in watchlist if is_covered_by_any_sub(item)
    )
    total_covered_hours = round(sum(
        classified[item.id]["hours"]
        for item in watchlist if is_covered_by_any_sub(item)
    ), 1)
    overall_pct = round((total_covered / total_watchlist * 100) if total_watchlist > 0 else 0)

    most_valuable = services_data[0]["name"] if services_data else None
    least_used = min(services_data, key=lambda s: s["total_covered"])["name"] if services_data else None

    return {
        "services": services_data,
        "orphaned_items": orphaned,
        "suggested_services": suggested_services,
        "summary": {
            "total_monthly_cost": total_monthly_cost,
            "total_covered": total_covered,
            "total_watchlist": total_watchlist,
            "overall_coverage_pct": overall_pct,
            "total_covered_hours": total_covered_hours,
            "most_valuable_service": most_valuable,
            "least_used_service": least_used,
        }
    }


@app.get("/services/", response_model=list[schemas.Service])
def read_services(db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    return crud.get_services(db, country=current_user.country)

@app.get("/services/{service_id}/plans", response_model=list[schemas.Plan])
def read_plans(service_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    return crud.get_plans(db, service_id=service_id, country=current_user.country)

@app.put("/users/me", response_model=schemas.User)
def update_user_me(country: str, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    return crud.update_user_profile(db, user_id=current_user.id, country=country)

@app.put("/users/me/preferences", response_model=schemas.User)
def update_user_preferences(preferences: schemas.UserPreferences, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    return crud.update_user_preferences(db, user_id=current_user.id, preferences=preferences)

@app.get("/media/{media_type}/{tmdb_id}/providers")
def get_media_providers(media_type: str, tmdb_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    """Fetch watch providers for a specific media item based on user's country"""
    import tmdb_client
    return tmdb_client.get_watch_providers(media_type, tmdb_id, region=current_user.country)

@app.get("/media/{media_type}/{tmdb_id}/details")
def get_media_details(media_type: str, tmdb_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    """Fetch full details for a specific media item"""
    import tmdb_client
    return tmdb_client.get_details(media_type, tmdb_id)

@app.post("/feedback/report")
def report_issue(
    payload: dict,
    current_user: models.User = Depends(dependencies.get_current_user)
):
    """Create a GitHub Issue from user feedback, with optional screenshot"""
    import requests as req
    import uuid
    
    category = payload.get("category", "other")
    description = payload.get("description", "").strip()
    screenshots = payload.get("screenshots", [])  # [{base64, name}, ...]
    
    if not description:
        raise HTTPException(status_code=400, detail="Description is required")
    
    # Map category to GitHub label
    label_map = {
        "bug": "bug",
        "feature": "enhancement",
        "other": "feedback"
    }
    label = label_map.get(category, "feedback")
    
    github_pat = settings.GITHUB_PAT
    github_repo = settings.GITHUB_REPO
    gh_headers = {
        "Authorization": f"token {github_pat}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    if not github_pat:
        raise HTTPException(status_code=500, detail="GitHub integration not configured")
    
    # Upload screenshots if provided
    screenshot_md = ""
    if screenshots:
        uploaded_images = []
        for sc in screenshots[:3]:  # Max 3
            try:
                sc_name = sc.get("name", "screenshot.png")
                sc_b64 = sc.get("base64", "")
                if not sc_b64:
                    continue
                    
                unique_name = f"{uuid.uuid4().hex[:8]}_{sc_name}"
                file_path = f".feedback/{unique_name}"
                
                upload_resp = req.put(
                    f"https://api.github.com/repos/{github_repo}/contents/{file_path}",
                    headers=gh_headers,
                    json={
                        "message": f"Upload feedback screenshot: {unique_name}",
                        "content": sc_b64
                    },
                    timeout=15
                )
                
                if upload_resp.status_code in [200, 201]:
                    download_url = upload_resp.json().get("content", {}).get("download_url", "")
                    if download_url:
                        uploaded_images.append(download_url)
                        logger.info(f"Screenshot uploaded: {file_path}")
                else:
                    logger.warning(f"Screenshot upload failed: {upload_resp.status_code}")
            except Exception as e:
                logger.warning(f"Screenshot upload failed: {e}")
        
        if uploaded_images:
            screenshot_md = "\n\n### Screenshots\n"
            for url in uploaded_images:
                screenshot_md += f"![Screenshot]({url})\n"
    
    # Build issue title and body
    title = f"[{category.upper()}] User Report from {current_user.email}"
    body = f"""### Category
**{category.capitalize()}**

### Description
{description}
{screenshot_md}
---
**Reported by:** {current_user.email}
**Country:** {current_user.country or 'Not set'}
**Submitted at:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}
"""
    
    try:
        response = req.post(
            f"https://api.github.com/repos/{github_repo}/issues",
            headers=gh_headers,
            json={
                "title": title,
                "body": body,
                "labels": [label]
            },
            timeout=10
        )
        
        if response.status_code == 201:
            issue_data = response.json()
            logger.info(f"GitHub Issue #{issue_data['number']} created by {current_user.email}")
            return {"message": "Issue reported successfully", "issue_number": issue_data["number"]}
        else:
            logger.error(f"GitHub API error: {response.status_code} {response.text}")
            raise HTTPException(status_code=500, detail="Failed to create issue")
    except Exception as e:
        logger.error(f"Failed to report issue: {e}")
        raise HTTPException(status_code=500, detail="Failed to report issue")

@app.get("/")
def read_root():
    return {"Hello": "World"}
