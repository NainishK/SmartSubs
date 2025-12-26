import sqlite3

def patch_v2():
    try:
        conn = sqlite3.connect('sql_app.db')
        cursor = conn.cursor()
        
        # 1. Patch Services table
        cursor.execute("PRAGMA table_info(services)")
        columns = [info[1] for info in cursor.fetchall()]
        if 'country' not in columns:
            print("Adding 'country' column to services table...")
            cursor.execute("ALTER TABLE services ADD COLUMN country VARCHAR DEFAULT 'US'")
        
        # 2. Patch Plans table
        cursor.execute("PRAGMA table_info(plans)")
        columns = [info[1] for info in cursor.fetchall()]
        if 'country' not in columns:
            print("Adding 'country' column to plans table...")
            cursor.execute("ALTER TABLE plans ADD COLUMN country VARCHAR DEFAULT 'US'")
            
        conn.commit()
        conn.close()
        print("Database schema updated successfully for Phase 5.")
    except Exception as e:
        print(f"Error patching database: {e}")

if __name__ == "__main__":
    patch_v2()
