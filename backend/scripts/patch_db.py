import sqlite3

def add_country_column():
    try:
        conn = sqlite3.connect('sql_app.db')
        cursor = conn.cursor()
        
        # Check if column exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'country' not in columns:
            print("Adding 'country' column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN country VARCHAR DEFAULT 'US'")
            conn.commit()
            print("Column added successfully.")
        else:
            print("'country' column already exists.")
            
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    add_country_column()
