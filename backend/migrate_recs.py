from sqlalchemy import create_engine, text
import os

DATABASE_URL = "sqlite:///./sql_app.db"
engine = create_engine(DATABASE_URL)

def migrate():
    with engine.connect() as conn:
        print("Migrating database for Recommendations Upgrade...")

        # 1. Add columns to watchlist_items
        try:
            conn.execute(text("ALTER TABLE watchlist_items ADD COLUMN user_rating INTEGER"))
            print("Added user_rating column.")
        except Exception as e:
            print(f"user_rating exists or failed: {e}")

        try:
            conn.execute(text("ALTER TABLE watchlist_items ADD COLUMN genre_ids TEXT"))
            print("Added genre_ids column.")
        except Exception as e:
            print(f"genre_ids exists or failed: {e}")

        # 2. Create user_interests table
        # SQLite doesn't support CREATE TABLE IF NOT EXISTS via simple execution comfortably depending on version
        # But standard SQL does.
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS user_interests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    genre_id INTEGER,
                    score INTEGER DEFAULT 0,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
            """))
            # Add index manually if needed or let standard creation handle it (id is indexed)
            # Let's add index on user_id for speed
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_user_interests_user_id ON user_interests (user_id)"))
            print("Created user_interests table.")
        except Exception as e:
            print(f"Error creating user_interests: {e}")

        print("Migration completed.")

if __name__ == "__main__":
    if os.path.exists("./sql_app.db"):
        migrate()
    else:
        print("Database not found.")
