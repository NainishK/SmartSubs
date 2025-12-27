from fastapi import FastAPI, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta
import models, schemas, crud, security, dependencies
from database import SessionLocal, engine
import traceback

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = "".join(traceback.format_exception(None, exc, exc.__traceback__))
    print(f"Global Exception: {error_msg}")
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "details": str(exc)},
    )

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

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

@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
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
        service = db.query(models.Service).filter(
            models.Service.name == sub.service_name,
            (models.Service.country == current_user.country) | (models.Service.country == "US")
        ).order_by(models.Service.country == current_user.country).first()
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
def add_to_watchlist(item: schemas.WatchlistItemCreate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    return crud.create_watchlist_item(db=db, item=item, user_id=current_user.id)

@app.get("/watchlist/", response_model=list[schemas.WatchlistItem])
def read_watchlist(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    return crud.get_watchlist(db, user_id=current_user.id, skip=skip, limit=limit)

@app.delete("/watchlist/{item_id}", response_model=schemas.WatchlistItem)
def delete_watchlist_item(item_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    db_item = crud.delete_watchlist_item(db, item_id=item_id, user_id=current_user.id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
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
def get_similar_recommendations(db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    import recommendations
    return recommendations.get_similar_content(db, user_id=current_user.id)

@app.post("/recommendations/refresh")
def refresh_recommendations_endpoint(db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    """Force refresh recommendations synchronously"""
    import recommendations
    recommendations.refresh_recommendations(db, user_id=current_user.id, force=True)
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
        
    return recommendations_list

@app.get("/services/", response_model=list[schemas.Service])
def read_services(db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    return crud.get_services(db, country=current_user.country)

@app.get("/services/{service_id}/plans", response_model=list[schemas.Plan])
def read_plans(service_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    return crud.get_plans(db, service_id=service_id, country=current_user.country)

@app.put("/users/me", response_model=schemas.User)
def update_user_me(country: str, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    return crud.update_user_profile(db, user_id=current_user.id, country=country)

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
