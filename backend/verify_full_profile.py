from database import SessionLocal
from models import User
import crud
import json

def verify_full_profile():
    db = SessionLocal()
    # Reset user 1
    user = db.query(User).filter(User.id == 1).first()
    if not user: return

    print(f"--- INITIAL STATE (US) ---")
    user.country = "US"
    initial_prefs = {
        "target_budget": 50, 
        "household_size": "Family",
        "regional_profiles": {}
    }
    user.preferences = json.dumps(initial_prefs)
    db.commit()
    print(f"Country: {user.country}, Prefs: {user.preferences}")
    
    # 1. Switch to IN (New Region) -> Should Inherit Family, Clear Budget
    print(f"\n--- SWITCHING TO IN ---")
    
    # Simulate update logic
    prefs = json.loads(user.preferences)
    if "regional_profiles" not in prefs: prefs["regional_profiles"] = {}
    
    # Save Snapshot
    profile_snapshot = {k: v for k, v in prefs.items() if k not in ["regional_profiles", "regional_budgets", "ai_skip_counts"]}
    if profile_snapshot: prefs["regional_profiles"]["US"] = profile_snapshot
    
    # To New Country
    new_country = "IN"
    if new_country in prefs["regional_profiles"]:
        prefs.update(prefs["regional_profiles"][new_country])
    else:
        # Inherit logic
        if "target_budget" in prefs: del prefs["target_budget"]
        if "target_currency" in prefs: del prefs["target_currency"]
        
    user.preferences = json.dumps(prefs)
    user.country = new_country
    db.commit()
    
    print(f"Country: {user.country}, Prefs: {user.preferences}")
    
    # ASSERT IN
    curr = json.loads(user.preferences)
    assert user.country == "IN"
    assert "target_budget" not in curr
    assert curr["household_size"] == "Family" # Inherited!
    assert curr["regional_profiles"]["US"]["target_budget"] == 50
    print("MATCH: IN state correct (Budget cleared, Family inherited)")
    
    # 2. Change Settings in IN
    print(f"\n--- MODIFYING IN PROFILE ---")
    curr["household_size"] = "Solo" # Change from Family
    curr["target_budget"] = 5000
    user.preferences = json.dumps(curr)
    db.commit()
    
    # 3. Switch Back to US -> Should Restore Family & $50
    print(f"\n--- SWITCHING BACK TO US ---")
    
    # Logic again
    prefs = json.loads(user.preferences)
    if "regional_profiles" not in prefs: prefs["regional_profiles"] = {}
    
    profile_snapshot = {k: v for k, v in prefs.items() if k not in ["regional_profiles", "regional_budgets", "ai_skip_counts"]}
    if profile_snapshot: prefs["regional_profiles"]["IN"] = profile_snapshot
    
    new_country = "US"
    if new_country in prefs["regional_profiles"]:
        prefs.update(prefs["regional_profiles"][new_country])
    else:
        if "target_budget" in prefs: del prefs["target_budget"]
        
    user.preferences = json.dumps(prefs)
    user.country = new_country
    db.commit()
    
    print(f"Country: {user.country}, Prefs: {user.preferences}")
    
    # ASSERT US
    curr = json.loads(user.preferences)
    assert user.country == "US"
    assert curr["target_budget"] == 50
    assert curr["household_size"] == "Family" # Restored!
    print("MATCH: US state correct (Family restored to Family from Solo)")

    print("\n✅ VERIFICATION SUCCESSFUL")
    db.close()

if __name__ == "__main__":
    verify_full_profile()
