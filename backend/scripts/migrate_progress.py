import sqlite3
import os

# Absolute path to DB
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sql_app.db")

def migrate():
    print(f"Migrating DB at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    columns = [
        ("current_season", "INTEGER DEFAULT 0"),
        ("current_episode", "INTEGER DEFAULT 0"),
        ("total_seasons", "INTEGER DEFAULT 0"),
        ("total_episodes", "INTEGER DEFAULT 0")
    ]
    
    for col, type_def in columns:
        try:
            print(f"Adding column {col}...")
            cursor.execute(f"ALTER TABLE watchlist_items ADD COLUMN {col} {type_def}")
            print(f"Added {col}.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"Column {col} already exists. Skipping.")
            else:
                print(f"Error adding {col}: {e}")
                
    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
