"""
Migration script to add status column to watchlist_items table
"""
import sqlite3

def migrate_status_column():
    conn = sqlite3.connect('sql_app.db')
    cursor = conn.cursor()
    
    # Check if column already exists
    cursor.execute("PRAGMA table_info(watchlist_items)")
    columns = [column[1] for column in cursor.fetchall()]
    
    if 'status' not in columns:
        print("Adding 'status' column to watchlist_items table...")
        cursor.execute("""
            ALTER TABLE watchlist_items 
            ADD COLUMN status TEXT DEFAULT 'plan_to_watch'
        """)
        conn.commit()
        print("Column added successfully!")
    else:
        print("Column 'status' already exists.")
    
    conn.close()

if __name__ == "__main__":
    migrate_status_column()
