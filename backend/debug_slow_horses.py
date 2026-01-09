import sqlite3
import sys
import os
from pathlib import Path

# Setup path for tmdb_client import if needed
project_root = Path(__file__).resolve().parents[1]
sys.path.append(str(project_root))

try:
    import tmdb_client
except ImportError:
    print("Warning: Could not import tmdb_client")

def verify_slow_horses_raw():
    db_path = 'sql_app.db'
    if not os.path.exists(db_path):
        print(f"DB not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print(f"Searching for 'Slow' in watchlist_items directly via SQLite...")
    cursor.execute("SELECT * FROM watchlist_items WHERE title LIKE '%Slow%'")
    rows = cursor.fetchall()
    
    if not rows:
        print("No item found with title containing 'Slow'.")
        # List all titles to be sure
        cursor.execute("SELECT id, title FROM watchlist_items LIMIT 5")
        print("First 5 items:", [dict(r) for r in cursor.fetchall()])
    else:
        for row in rows:
            item = dict(row)
            print(f"\n--- Found Item (Raw DB) ---")
            print(f"ID: {item['id']}")
            print(f"Title: {item['title']}")
            print(f"TMDB ID: {item['tmdb_id']}")
            print(f"Media Type: {item['media_type']}")
            print(f"Overview: {item['overview']}")
            print(f"Rating: {item['vote_average']}")
            print(f"Poster: {item['poster_path']}")
            print(f"Genres (Raw): {item['genre_ids']}")
            
            # Test TMDB Fetch if client available
            if 'tmdb_client' in sys.modules:
                try:
                    print(f"\n[Test] Fetching TMDB details for ID {item['tmdb_id']}...")
                    details = tmdb_client.get_details(item['media_type'], item['tmdb_id'])
                    if details:
                        print(f"TMDB Title: {details.get('title') or details.get('name')}")
                        print(f"TMDB Overview: {details.get('overview')[:50]}..." if details.get('overview') else "None")
                    else:
                        print("TMDB returned empty details.")
                except Exception as e:
                    print(f"TMDB Fetch Error: {e}")

    conn.close()

if __name__ == "__main__":
    verify_slow_horses_raw()

