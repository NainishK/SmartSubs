from database import engine
import models

def recreate_tables():
    try:
        print("Dropping all tables...")
        models.Base.metadata.drop_all(bind=engine)
        
        print("Creating all tables with updated schema...")
        models.Base.metadata.create_all(bind=engine)
        
        print("Tables recreated successfully!")
    except Exception as e:
        print(f"Error recreating tables: {e}")

if __name__ == "__main__":
    recreate_tables()
