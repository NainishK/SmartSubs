import sqlite3
import os

DB_FILE = "sql_app.db"

def migrate():
    if not os.path.exists(DB_FILE):
        print(f"ERROR: {DB_FILE} not found!")
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    try:
        print("Checking for Numeric AI columns in 'users' table...")
        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if "ai_request_limit" not in columns:
            print("Adding 'ai_request_limit'...")
            cursor.execute("ALTER TABLE users ADD COLUMN ai_request_limit INTEGER DEFAULT 5")
        else:
            print("'ai_request_limit' already exists.")

        if "ai_usage_count" not in columns:
            print("Adding 'ai_usage_count'...")
            cursor.execute("ALTER TABLE users ADD COLUMN ai_usage_count INTEGER DEFAULT 0")
        else:
            print("'ai_usage_count' already exists.")
            
        conn.commit()
        print("Migration complete.")
        
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
