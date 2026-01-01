import sqlite3

def patch_v3():
    try:
        conn = sqlite3.connect('sql_app.db')
        cursor = conn.cursor()
        
        # Patch Users table
        cursor.execute("PRAGMA table_info(users)")
        columns = [info[1] for info in cursor.fetchall()]
        if 'preferences' not in columns:
            print("Adding 'preferences' column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN preferences VARCHAR")
            
        conn.commit()
        conn.close()
        print("Database schema updated successfully for Phase 8.")
    except Exception as e:
        print(f"Error patching database: {e}")

if __name__ == "__main__":
    patch_v3()
