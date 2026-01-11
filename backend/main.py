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

app.add_middleware(SessionMiddleware, secret_key="SUPER_SECRET_KEY")

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
def read_user_stats(db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    subs = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.is_active == True
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
def read_user_spending(db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    subs = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.is_active == True
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
    sub = crud.create_user_subscription(db=db, subscription=subscription, user_id=current_user.id)
    
    # Attach logo
    service = db.query(models.Service).filter(
        models.Service.name == sub.service_name,
        (models.Service.country == current_user.country) | (models.Service.country == "US")
    ).order_by(models.Service.country == current_user.country).first()
    if service:
        sub.logo_url = service.logo_url

    # Trigger background refresh
    import recommendations
    background_tasks.add_task(recommendations.refresh_recommendations, SessionLocal(), current_user.id, force=True)
    
    return sub

@app.get("/subscriptions/", response_model=list[schemas.Subscription])
def read_subscriptions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    subs = db.query(models.Subscription).filter(models.Subscription.user_id == current_user.id).offset(skip).limit(limit).all()
    # Attach logos
    for sub in subs:
        # Use desc() to prioritize True (Match) over False
        service = db.query(models.Service).filter(
            models.Service.name == sub.service_name,
            (models.Service.country == current_user.country) | (models.Service.country == "US")
        ).order_by(desc(models.Service.country == current_user.country)).first()
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
    
    # Fetch items for context
    items = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.user_id == current_user.id,
        models.WatchlistItem.tmdb_id.in_(item_ids)
    ).all()
    
    subs = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.is_active == True,
        models.Subscription.category == 'OTT'
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
    
    # print(f"DEBUG: Checking {len(items)} items against subs: {[s.service_name for s in subs]}")
    
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
    # print(f"DEBUG: Availability check took {time.time() - start_time:.2f}s for {len(items)} items")
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

@app.get("/recommendations/ai", response_model=list[schemas.AIRecommendation])
def get_cached_ai_recommendations(db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    """Retrieve cached AI recommendations if available"""
    import recommendations
    cached = recommendations.get_cached_data(db, user_id=current_user.id, category="ai_picks")
    return cached if cached else []


@app.post("/recommendations/ai", response_model=list[schemas.AIRecommendation])
def get_ai_recommendations(db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    """Generate AI-powered recommendations on demand"""
    # 1. Check Permissions
    validate_ai_access(db, current_user)

    import ai_client
    import crud
    
    # Gather Context
    watchlist = crud.get_watchlist(db, user_id=current_user.id, limit=100)
    subs = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id,
        models.Subscription.is_active == True,
        models.Subscription.category == 'OTT'
    ).all()
    
    # Format for AI
    history = [{"title": w.title, "status": w.status} for w in watchlist]
    ratings = [{"title": w.title, "rating": w.user_rating} for w in watchlist if w.user_rating]
    active_subs = [s.service_name for s in subs]
    
    recommendations_list = ai_client.generate_ai_recommendations(history, ratings, active_subs, country=current_user.country)
    
    # Cache the result if valid
    if recommendations_list:
        import recommendations as rec_engine
        rec_engine.set_cached_data(db, user_id=current_user.id, category="ai_picks", data=recommendations_list)
        
        # 2. Update Usage Timestamp
        crud.update_user_ai_usage(db, current_user.id)
        
    return recommendations_list

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
         # Using a distinct category for this unified blob
         cached = recommendations.get_cached_data(db, user_id=current_user.id, category="unified_insights")
         if cached and (cached.get('picks') or cached.get('strategy')):
             # Validate and filter bad items, but keep good ones (Partial Cache Strategy)
             valid_picks = []
             if cached.get('picks'):
                 for pick in cached['picks']:
                     if pick.get('tmdb_id') and pick.get('tmdb_id') != 0 and pick.get('poster_path'):
                         valid_picks.append(pick)
             
             # If we have at least some valid picks, return them to prevent constant loading loops
             if len(valid_picks) > 0:
                 cached['picks'] = valid_picks
                 return cached

    # 1. Check Permissions (Only if we need to generate)
    try:
        validate_ai_access(db, current_user)
    except HTTPException as e:
        if e.status_code == 429:
             # LIMIT REACHED: Try to fallback to ANY cache (even if we thought it was 'bad' or 'old')
             # Re-fetch raw cache just in case we filtered it out above
             fallback = recommendations.get_cached_data(db, user_id=current_user.id, category="unified_insights")
             
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
            country=current_user.country,
            currency=currency
        )
    except Exception as e:
         error_str = str(e)
         is_quota = "429" in error_str or "quota" in error_str.lower() or "ResourceExhausted" in error_str
         
         if is_quota:
             print(f"DEBUG: Gemini Quota Exceeded: {e}")
             
             # 1. Try Cache
             fallback = recommendations.get_cached_data(db, user_id=current_user.id, category="unified_insights")
             if fallback and (fallback.get('picks') or fallback.get('strategy')):
                 fallback['warning'] = "Daily AI limit reached. Viewing cached results."
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
        
    # Cache
    recommendations.set_cached_data(db, user_id=current_user.id, category="unified_insights", data=insights)
    
    # Update Usage (Admin Control)
    crud.update_user_ai_usage(db, current_user.id)
    
    return insights

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

@app.get("/")
def read_root():
    return {"Hello": "World"}
