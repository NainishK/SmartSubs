import os
import sqlalchemy
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load params
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ Error: DATABASE_URL is not set.")
    exit(1)

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
        ]
        
        for table, col, dtype in columns_to_add:
            try:
                print(f"   Adding column {col} to {table}...")
                sql = text(f"ALTER TABLE {table} ADD COLUMN {col} {dtype}")
                conn.execute(sql)
                conn.commit()
                print(f"   ✅ Added {col}")
            except Exception as e:
                # Check for "Duplicate column" error
                if "already exists" in str(e):
                    print(f"   ⚠️  Column {col} already exists (Skipping)")
                else:
                    print(f"   ❌ Error adding {col}: {e}")

if __name__ == "__main__":
    try:
        run_migration()
        print("\n✅ Migration Complete!")
    except Exception as e:
        print(f"\n❌ Migration Failed: {e}")
