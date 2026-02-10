from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import models, schemas, crud, security, email_client
from database import get_db # Assuming get_db is available or I need to import it
from dependencies import get_db, get_current_user
import logging
import sys

# Setup Logger for Auth
logger = logging.getLogger("auth_router")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(handler)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)



class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    user = crud.get_user_by_email(db, email=request.email)
    if not user:
        # Don't reveal if user exists or not for security, but for now return 200
        return {"message": "If this email is registered, you will receive a password reset link."}
    
    token = security.create_password_reset_token(user.email)
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    
    email_body = f"""
    <h1>Password Reset Request</h1>
    <p>You requested a password reset for your SmartSubs account.</p>
    <p>Click the link below to reset your password:</p>
    <a href="{reset_link}">Reset Password</a>
    <p>This link expires in 1 hour.</p>
    <p>If you did not request this, please ignore this email.</p>
    """
    
    await email_client.send_email(
        subject="Reset Your Password - SmartSubs",
        recipients=[user.email],
        body=email_body
    )
    
    return {"message": "If this email is registered, you will receive a password reset link."}

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = security.verify_password_reset_token(request.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
        
    user = crud.get_user_by_email(db, email=email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    crud.update_user_password(db, user_id=user.id, new_password=request.new_password)
    
    crud.update_user_password(db, user_id=user.id, new_password=request.new_password)
    
    return {"message": "Password reset successfully"}

# --- OAuth (Google) ---
from authlib.integrations.starlette_client import OAuth
from starlette.requests import Request
from starlette.config import Config
from config import settings

oauth = OAuth()
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    access_token_url='https://oauth2.googleapis.com/token',
    access_token_params=None,
    authorize_url='https://accounts.google.com/o/oauth2/auth',
    authorize_params=None,
    api_base_url='https://www.googleapis.com/oauth2/v1/',
    client_kwargs={'scope': 'email profile', 'timeout': 10.0},
)

@router.get("/login/google")
async def login_google(request: Request):
    logger.info("👉 Redirecting to Google Login...")
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/callback/google")
async def auth_google(request: Request, db: Session = Depends(get_db)):
    try:
        # 1. Exchange Code for Token
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        logger.error(f"OAuth Token Exchange Failed: {e}")
        raise HTTPException(status_code=400, detail="Authentication failed. Please try again.")

    # 2. Fetch User Info manually (Pure OAuth2 Flow)
    try:
        resp = await oauth.google.get('userinfo', token=token)
        user_info = resp.json()
    except Exception as e:
         logger.error(f"Failed to fetch userinfo: {e}")
         raise HTTPException(status_code=400, detail="Failed to retrieve user profile.")
    

    if not user_info:    
         raise HTTPException(status_code=400, detail="Failed to retrieve user info")
         
    email = user_info.get('email')
    google_id = user_info.get('sub') or user_info.get('id') # 'sub' is standard OIDC, 'id' is Google API
    picture = user_info.get('picture')
    
    # 1. Existing User?
    user = crud.get_user_by_email(db, email=email)
    
    if user:
        # Link Account logic (if not linked)
        if not user.google_id:
             user.google_id = google_id
             user.avatar_url = picture
             db.commit()
    else:
        # Create New User (No Password)
        new_user = models.User(
            email=email, 
            google_id=google_id, 
            avatar_url=picture,
            is_active=True,
            country="US" # Default, user can change later
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        user = new_user

    # Generate Access Token
    access_token = security.create_access_token(data={"sub": user.email})
    
    # Redirect to Frontend with Token
    # In production, use a secure cookie or postMessage. For now, URL param is easiest for Dev.
    frontend_url = f"{settings.FRONTEND_URL}/login/callback?token={access_token}"
    from starlette.responses import RedirectResponse
    return RedirectResponse(url=frontend_url)

@router.post("/disconnect/google")
async def disconnect_google(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not user.hashed_password:
        raise HTTPException(status_code=400, detail="You must set a password before disconnecting your Google account.")
        
    user.google_id = None
    # user.avatar_url = None # Keep avatar? acts as a nice default. Let's keep it.
    db.commit()
    
    return {"message": "Google account disconnected successfully"}
