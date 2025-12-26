import sqlite3

def patch_db():
    conn = sqlite3.connect('subscriptions.db')
    cursor = conn.cursor()
    
    try:
        print("Checking for billing_cycle column in plans table...")
        cursor.execute("PRAGMA table_info(plans)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'billing_cycle' not in columns:
            print("Adding billing_cycle column to plans table...")
            cursor.execute("ALTER TABLE plans ADD COLUMN billing_cycle TEXT DEFAULT 'monthly'")
            print("Column added successfully.")
        else:
            print("billing_cycle column already exists.")
            
        conn.commit()
    except Exception as e:
        print(f"Error patching database: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    patch_db()
