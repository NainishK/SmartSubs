import sqlite3

def check_schema():
    conn = sqlite3.connect('sql_app.db')
    cursor = conn.cursor()
    
    print("--- Table: watchlist_items ---")
    try:
        cursor.execute("PRAGMA table_info(watchlist_items)")
        columns = cursor.fetchall()
        for col in columns:
            print(col) # cid, name, type, notnull, dflt_value, pk
    except Exception as e:
        print(f"Error: {e}")
        
    conn.close()

if __name__ == "__main__":
    check_schema()
