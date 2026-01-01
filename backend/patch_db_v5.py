
import sqlite3

def patch_v5():
    try:
        conn = sqlite3.connect('backend/sql_app.db')
        cursor = conn.cursor()
        
        # Patch Users table
        cursor.execute("PRAGMA table_info(users)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'ai_access_status' not in columns:
            print("Adding 'ai_access_status' column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN ai_access_status VARCHAR DEFAULT 'none'")
            
            # Backfill existing users who have access
            print("Backfilling status for existing users...")
            cursor.execute("UPDATE users SET ai_access_status = 'approved' WHERE ai_allowed = 1")
            
        conn.commit()
        conn.close()
        print("Database schema updated successfully for Phase 8.1 (AI Access Request).")
    except Exception as e:
        print(f"Error patching database: {e}")

if __name__ == "__main__":
    patch_v5()
