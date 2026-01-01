import sqlite3
import os

DB_FILE = "sql_app.db"

def migrate():
    if not os.path.exists(DB_FILE):
        print("Database not found!")
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE watchlist_items ADD COLUMN available_on TEXT")
        conn.commit()
        print("Migration successful: Added 'available_on' column.")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("Migration skipped: Column already exists.")
        else:
            print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
