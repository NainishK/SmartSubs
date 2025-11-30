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
    background_tasks.add_task(recommendations.refresh_recommendations, db, user.id, force=False)
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me/", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(dependencies.get_current_user)):
    return current_user

@app.get("/search")
def search_content(query: str, current_user: models.User = Depends(dependencies.get_current_user)):
    import tmdb_client
    return tmdb_client.search_multi(query)

@app.post("/subscriptions/", response_model=schemas.Subscription)
def create_subscription(subscription: schemas.SubscriptionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    # Check if already exists (crud now returns existing if found, but we might want to raise error)
    # Actually, let's modify crud to return None if duplicate or handle it here.
    # For simplicity, if the ID is set, it means it existed.
    sub = crud.create_user_subscription(db=db, subscription=subscription, user_id=current_user.id)
    # We can't easily tell if it was just created or existed without changing crud return type or logic.
    # But for now, returning the existing one is "idempotent" which is fine, OR we can raise error.
    # Let's check explicitly here for better UX if the user wants to know.
    # But crud update was: return existing. So frontend will just see success.
    # If we want to block duplicates with error:
    # We should have checked before calling create, or modify create to raise.
    # Let's leave it as idempotent (success) for now, or user might be confused why it "failed".
    # Actually, user said "i could add same show multiple times", implying they DON'T want that.
    # So idempotent is good (it won't add a second one).
    return sub

@app.get("/subscriptions/", response_model=list[schemas.Subscription])
def read_subscriptions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    # Filter by current user
    return db.query(models.Subscription).filter(models.Subscription.user_id == current_user.id).offset(skip).limit(limit).all()

@app.delete("/subscriptions/{subscription_id}", response_model=schemas.Subscription)
def delete_subscription(subscription_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    db_sub = crud.delete_subscription(db, subscription_id=subscription_id, user_id=current_user.id)
    if db_sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
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
def refresh_recommendations_endpoint(background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    """Force refresh recommendations in background"""
    import recommendations
    background_tasks.add_task(recommendations.refresh_recommendations, db, user_id=current_user.id, force=True)
    return {"message": "Recommendation refresh started"}

@app.get("/services/", response_model=list[schemas.Service])
def read_services(db: Session = Depends(get_db)):
    return crud.get_services(db)

@app.get("/services/{service_id}/plans", response_model=list[schemas.Plan])
def read_plans(service_id: int, db: Session = Depends(get_db)):
    return crud.get_plans(db, service_id=service_id)

@app.put("/users/me", response_model=schemas.User)
def update_user_me(country: str, db: Session = Depends(get_db), current_user: models.User = Depends(dependencies.get_current_user)):
    return crud.update_user_profile(db, user_id=current_user.id, country=country)

@app.get("/")
def read_root():
    return {"Hello": "World"}
