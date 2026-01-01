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
        print("Checking for AI columns in 'users' table...")
        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if "ai_allowed" not in columns:
            print("Adding 'ai_allowed'...")
            cursor.execute("ALTER TABLE users ADD COLUMN ai_allowed BOOLEAN DEFAULT 1")
        else:
            print("'ai_allowed' already exists.")

        if "ai_quota_policy" not in columns:
            print("Adding 'ai_quota_policy'...")
            cursor.execute("ALTER TABLE users ADD COLUMN ai_quota_policy TEXT DEFAULT 'unlimited'")
        else:
            print("'ai_quota_policy' already exists.")

        if "last_ai_usage" not in columns:
            print("Adding 'last_ai_usage'...")
            cursor.execute("ALTER TABLE users ADD COLUMN last_ai_usage TIMESTAMP")
        else:
            print("'last_ai_usage' already exists.")
            
        conn.commit()
        print("Migration complete.")
        
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
