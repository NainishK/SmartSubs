import sys
import os
import json
from dotenv import load_dotenv

# Force load backend/.env
backend_env = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if os.path.exists(backend_env):
    load_dotenv(backend_env)
    print(f"✅ Loaded .env from: {backend_env}")
else:
    print(f"⚠️ Warning: .env not found at {backend_env}")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path to import models
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from models import User, Base
from config import settings
from database import SessionLocal

def check_skips():
    print("\n🕵️ INSPECTING USER PREFERENCES (SKIP TRACKER)...\n")
    
    # Debug DB URL (Masked)
    db_url = settings.DATABASE_URL
    if "@" in db_url:
        masked_url = db_url.split("@")[1] 
        print(f"🔌 Connecting to: ...@{masked_url}")
    else:
        print(f"🔌 Connecting to: {db_url}")
    
    # Connect to DB
    session = SessionLocal()
    
    # Get User (Get ANY user found)
    user = session.query(User).first()
    
    if not user:
        print("❌ No users found in database.")
        users = session.query(User).all()
        print(f"DEBUG: Found {len(users)} users in table.")
        return
        
    print(f"👤 User: {user.email} (ID: {user.id})")
    
    if not user.preferences:
        print("⚠️ No preferences found (None).")
        return
        
    try:
        prefs = json.loads(user.preferences)
        skip_counts = prefs.get("ai_skip_counts", {})
        
        print(f"\n📉 SKIP COUNTS (Items you ignored):")
        if not skip_counts:
            print("   (Empty - No skips recorded yet)")
        else:
            for tmdb_id, count in skip_counts.items():
                print(f"   - TMDB ID {tmdb_id}: Skipped {count} times")
                if count >= 2:
                    print(f"     🚫 STATUS: SOFT BANNED (Will be hidden from AI)")
                else:
                    print(f"     ⚠️ STATUS: WARNING (1 more skip to ban)")
                    
    except Exception as e:
        print(f"❌ Error parsing preferences JSON: {e}")
        print(f"   Raw Content: {user.preferences}")
        
    session.close()

if __name__ == "__main__":
    check_skips()
