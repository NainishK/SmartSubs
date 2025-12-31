import sqlite3
import os

DB_FILE = "sql_app.db"

def check_subs():
    if not os.path.exists(DB_FILE):
        print("DB not found")
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    print("--- Active Subscriptions ---")
    cursor.execute("SELECT service_name, is_active FROM subscriptions WHERE user_id=1")
    subs = cursor.fetchall()
    
    if not subs:
        print("No subscriptions found for user 1.")
    
    for s in subs:
        status = "Active" if s[1] else "Inactive"
        print(f"• {s[0]} ({status})")
        
    conn.close()

if __name__ == "__main__":
    check_subs()
