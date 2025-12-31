import sqlite3
import os

DB_FILE = "sql_app.db"

def check():
    if not os.path.exists(DB_FILE):
        print(f"ERROR: {DB_FILE} not found!")
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    try:
        cursor.execute("PRAGMA table_info(watchlist_items)")
        columns = cursor.fetchall()
        print(f"Columns in 'watchlist_items' ({len(columns)}):")
        found = False
        for col in columns:
            name = col[1]
            print(f" - {name}")
            if name == "available_on":
                found = True
        
        if found:
            print("\nSUCCESS: 'available_on' column FOUND.")
        else:
            print("\nFAILURE: 'available_on' column NOT FOUND.")
            # Attempt migration again forcefully
            print("Attempting forced migration...")
            try:
                cursor.execute("ALTER TABLE watchlist_items ADD COLUMN available_on TEXT")
                conn.commit()
                print("Forced migration successful.")
            except Exception as e:
                print(f"Forced migration failed: {e}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check()
