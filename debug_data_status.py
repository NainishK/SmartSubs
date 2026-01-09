import sqlite3
import os

titles_to_check = ["Slow Horses", "Mr. Robot", "Death Note", "Severance", "Silo"]

def check_data():
    db_path = 'backend/sql_app.db' # Correct relative path from root
    if not os.path.exists(db_path):
        print(f"DB not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print(f"--- Checking specific titles in: {db_path} ---")
    
    for title in titles_to_check:
        print(f"\nSearching for: {title}")
        cursor.execute("SELECT id, title, vote_average, available_on, media_type, tmdb_id FROM watchlist_items WHERE title LIKE ?", (f"%{title}%",))
        rows = cursor.fetchall()
        
        if not rows:
            print("  -> Not found.")
        else:
            for row in rows:
                item = dict(row)
                print(f"  -> Found ID {item['id']}: '{item['title']}'")
                print(f"     Rating (vote_average): {item['vote_average']} (Type: {type(item['vote_average'])})")
                print(f"     Service Badge (available_on): {item['available_on']}")
                print(f"     TMDB ID: {item['tmdb_id']} ({item['media_type']})")

    conn.close()

if __name__ == "__main__":
    check_data()
