"""
Backfill script: Fetches original_language from TMDB for all watchlist items.
This enables anime detection (original_language == 'ja' + Animation genre).
Run once after adding the original_language column.
"""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__) + '/..')

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from database import SessionLocal
import models
import tmdb_client

def backfill_original_language():
    db = SessionLocal()
    try:
        items = db.query(models.WatchlistItem).filter(
            models.WatchlistItem.original_language == None
        ).all()
        
        print(f"Found {len(items)} items without original_language")
        
        updated = 0
        errors = 0
        for i, item in enumerate(items):
            try:
                # Fetch details from TMDB
                details = tmdb_client.get_details(item.media_type or 'movie', item.tmdb_id)
                
                lang = details.get('original_language', '')
                if lang:
                    item.original_language = lang
                    updated += 1
                    badge = " 🎌 ANIME" if lang == 'ja' and item.genre_ids and '16' in str(item.genre_ids) else ""
                    print(f"  [{i+1}/{len(items)}] {item.title}: {lang}{badge}")
                else:
                    print(f"  [{i+1}/{len(items)}] {item.title}: no language found")
                    
            except Exception as e:
                errors += 1
                print(f"  [{i+1}/{len(items)}] {item.title}: ERROR - {e}")
        
        db.commit()
        print(f"\n✅ Done! Updated: {updated}, Errors: {errors}")
        
    finally:
        db.close()

if __name__ == "__main__":
    backfill_original_language()
