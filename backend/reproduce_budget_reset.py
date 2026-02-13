import json
from database import SessionLocal
from models import User

def test_budget_reset():
    db = SessionLocal()
    user = db.query(User).filter(User.id == 1).first()
    
    if not user:
        print("User 1 not found")
        return

    # 1. Setup Initial State (Budget = 500)
    prefs = {"target_budget": 500, "budget": 500, "household_size": "Solo"}
    user.preferences = json.dumps(prefs)
    user.country = "US"
    db.commit()
    db.refresh(user)
    print(f"[SETUP] User Prefs: {user.preferences}")
    
    # 2. Simulate Reset Logic (from main.py)
    try:
        print(f"DEBUG: Checking prefs for cleanup. Current: {user.preferences}")
        prefs = json.loads(user.preferences)
        
        changed = False
        if "target_budget" in prefs:
            print("DEBUG: Removing target_budget")
            del prefs["target_budget"]
            changed = True
        if "budget" in prefs:
            print("DEBUG: Removing budget (legacy)")
            del prefs["budget"]
            changed = True
            
        if changed:
            print(f"DEBUG: Saving cleaned prefs: {json.dumps(prefs)}")
            # Manual update instead of calling crud to verify logic isolation
            user.preferences = json.dumps(prefs)
            db.commit()
            db.refresh(user)
        else:
            print("DEBUG: No budget keys found to remove.")
    except Exception as e:
        print(f"DEBUG: Error in preference cleanup: {e}")

    # 3. Verify Result
    final_user = db.query(User).filter(User.id == 1).first()
    print(f"[RESULT] User Prefs: {final_user.preferences}")
    
    with open("reproducer_result.txt", "w") as f:
        f.write(final_user.preferences)
    
    db.close()

if __name__ == "__main__":
    test_budget_reset()
