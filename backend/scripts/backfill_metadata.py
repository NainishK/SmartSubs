#!/usr/bin/env python3
"""Backfill metadata (Genres, Overview, Rating, Poster) for existing watchlist items.

This script scans the WatchlistItem table and checks for missing critical metadata:
- genre_ids (must be valid JSON list)
- overview (synopsis)
- vote_average (rating)
- poster_path
- title (canonical)

If any field is missing or malformed, it fetches the full details from TMDB and
updates the record.

Run with the project's virtual environment activated:
     python backend/scripts/backfill_metadata.py
"""

import json
import sys
import os
from pathlib import Path

# Ensure the project root is on PYTHONPATH
project_root = Path(__file__).resolve().parents[1]
sys.path.append(str(project_root))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models
import tmdb_client

# Database Connection (Supports Neon/Postgres via Env Var)
# Default to absolute path of backend/sql_app.db to avoid CWD issues
DB_PATH = project_root / "sql_app.db"
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")

# Fix for some Postgres dialects if needed, though usually standard
if "postgres://" in SQLALCHEMY_DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def is_valid_genre_json(value: str) -> bool:
    """Return True if `value` is a JSON list of integers."""
    if not value: return False
    try:
        parsed = json.loads(value)
        return isinstance(parsed, list) and all(isinstance(i, int) for i in parsed)
    except Exception:
        return False


def backfill():
    print(f"Connecting to database: {SQLALCHEMY_DATABASE_URL.split('@')[-1] if '@' in SQLALCHEMY_DATABASE_URL else 'SQLite/Local'}")
    db = SessionLocal()
    try:
        items = db.query(models.WatchlistItem).all()
        print(f"Scanning {len(items)} watchlist items for missing metadata...")
        
        updated_count = 0
        
        for item in items:
            needs_update = False
            missing_fields = []

            # CHECK 1: Genres
            if not is_valid_genre_json(item.genre_ids):
                needs_update = True
                missing_fields.append("genres")
            
            # CHECK 2: Overview (Synopsis)
            if not item.overview:
                needs_update = True
                missing_fields.append("overview")

            # CHECK 3: Rating (Check for None OR 0/0.0)
            if item.vote_average is None or item.vote_average == 0:
                needs_update = True
                missing_fields.append("rating")

            # CHECK 4: Poster
            if not item.poster_path:
                needs_update = True
                missing_fields.append("poster")
                
            # CHECK 5: Service Badge (available_on)
            if not item.available_on:
                needs_update = True
                missing_fields.append("badge")
                
            if not needs_update:
                continue

            print(f"Updating ID {item.id} ({item.title or 'Unknown'}): Missing {', '.join(missing_fields)}")

            # Fetch details from TMDB
            try:
                # 1. Fetch Basic Details (Metadata)
                details = tmdb_client.get_details(item.media_type, item.tmdb_id)
                if details:
                    if not item.title: item.title = details.get('title') or details.get('name')
                    if not item.overview: item.overview = details.get('overview') or ""
                    if not item.poster_path: item.poster_path = details.get('poster_path')
                    if item.vote_average is None or item.vote_average == 0:
                        item.vote_average = details.get('vote_average')
                    
                    # Genres
                    if "genres" in missing_fields or not is_valid_genre_json(item.genre_ids):
                        genre_objs = details.get("genres", [])
                        genre_ids = [g.get("id") for g in genre_objs if isinstance(g.get("id"), int)]
                        item.genre_ids = json.dumps(genre_ids) if genre_ids else None
                
                # 2. Fetch Providers (Service Badge)
                # We need the user's country to get accurate providers
                owner = db.query(models.User).filter(models.User.id == item.user_id).first()
                country = owner.country if owner else "US"
                
                providers = tmdb_client.get_watch_providers(item.media_type, item.tmdb_id, region=country)
                if providers:
                    # Look for flatrate (streaming) providers
                    flatrate = providers.get("flatrate", [])
                    if flatrate:
                        # Simple logic: Take the first top provider or match against known list
                        # For now, just taking the first one is better than NULL
                        # Ideally, we match against user subscriptions, but here we just want existing availability
                        # Let's map key names: "Apple TV Plus" -> "Apple TV+"
                        first_provider = flatrate[0]["provider_name"]
                        
                        # Normalize some common names if needed
                        if "Apple TV" in first_provider: first_provider = "Apple TV+"
                        if "Amazon Prime" in first_provider: first_provider = "Prime Video"
                        if "Disney" in first_provider: first_provider = "Disney+"
                        
                        item.available_on = first_provider
                
                db.add(item)
                updated_count += 1
                print(f" -> Backfilled successfully.")
            except Exception as e:
                print(f" -> Error fetching details: {e}")
                
        db.commit()
        print(f"\nCompleted! Updated {updated_count} items.")
        
    except Exception as e:
        print(f"Error during backfill: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    backfill()
