import os
import sqlalchemy
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load params
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("⚠️  DATABASE_URL not set. Defaulting to local SQLite.")
    DATABASE_URL = "sqlite:///./sql_app.db"

# Fix Postgres URL if needed
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

print(f"🔄 Connecting to Database...")
engine = create_engine(DATABASE_URL)

def run_migration():
    with engine.connect() as conn:
        print("🔍 Checking schema...")
        
        # Check if columns exist
        # We can try to select them, if fail, we add them. 
        # Or just blindly try adding with "IF NOT EXISTS" equivalent logic (Postgres supports it via DO block or just exception handling)
        
        # Simpler approach: Try adding each column, catch "duplicate column" error
        columns_to_add = [
            ("watchlist_items", "current_season", "INTEGER DEFAULT 0"),
            ("watchlist_items", "current_episode", "INTEGER DEFAULT 0"),
            ("watchlist_items", "total_seasons", "INTEGER DEFAULT 0"),
            ("watchlist_items", "total_episodes", "INTEGER DEFAULT 0"),
            ("users", "google_id", "TEXT UNIQUE"),
            ("users", "avatar_url", "TEXT"),
        ]
        
        for table, col, dtype in columns_to_add:
            try:
                print(f"   Adding column {col} to {table}...")
                # SQLite Workaround for UNIQUE
                is_sqlite = "sqlite" in str(conn.engine.url)
                if is_sqlite and "UNIQUE" in dtype:
                    # 1. Add column without UNIQUE
                    safe_dtype = dtype.replace("UNIQUE", "").strip()
                    sql = text(f"ALTER TABLE {table} ADD COLUMN {col} {safe_dtype}")
                    conn.execute(sql)
                    conn.commit()
                    
                    # 2. Add Unique Index
                    index_sql = text(f"CREATE UNIQUE INDEX IF NOT EXISTS ix_{table}_{col} ON {table} ({col})")
                    conn.execute(index_sql)
                    conn.commit()
                else:
                    sql = text(f"ALTER TABLE {table} ADD COLUMN {col} {dtype}")
                    conn.execute(sql)
                    conn.commit()
                
                print(f"   ✅ Added {col}")
            except Exception as e:
                # IMPORTANT: Postgres requires rollback after error to reset transaction state
                conn.rollback()
                
                # Check for "Duplicate column" error
                if "already exists" in str(e) or "duplicate column name" in str(e):
                    print(f"   ⚠️  Column {col} already exists (Skipping)")
                else:
                    print(f"   ❌ Error adding {col}: {e}")

if __name__ == "__main__":
    try:
        run_migration()
        print("\n✅ Migration Complete!")
    except Exception as e:
        print(f"\n❌ Migration Failed: {e}")
