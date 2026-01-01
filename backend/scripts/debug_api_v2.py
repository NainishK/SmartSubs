import os
import sys
import logging
import json

# Setup logging to file
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("ai_debug.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("debug_ai")

print("--- 1. Checking Imports ---")
try:
    import google.generativeai as genai
    from config import settings
    import ai_client
    print("Imports successful.")
except ImportError as e:
    print(f"CRITICAL IMPORT ERROR: {e}")
    sys.exit(1)

print("\n--- 2. Checking Configuration ---")
api_key = settings.GEMINI_API_KEY
if not api_key:
    print("ERROR: GEMINI_API_KEY is missing/empty in settings.")
elif api_key == "YOUR_GEMINI_API_KEY_HERE":
     print("ERROR: GEMINI_API_KEY is set to default placeholder!")
     print("Please set a valid GEMINI_API_KEY in .env or config.py")
else:
    print(f"API Key found: {api_key[:4]}...{api_key[-4:]} (Length: {len(api_key)})")
    
print("\n--- 3. Testing AI Connection ---")
if not api_key or "YOUR_GEMINI" in api_key:
    print("Skipping connection test due to invalid key.")
else:
    try:
        print("Listing models...")
        models = list(genai.list_models())
        print(f"Connection Successful! Found {len(models)} models.")
        found_flash = False
        for m in models:
            if 'gemini-1.5-flash' in m.name:
                found_flash = True
                print(f" - Found model: {m.name}")
                break
        if not found_flash:
            print("WARNING: gemini-1.5-flash not found in model list.")
            
    except Exception as e:
        print(f"CONNECTION ERROR: {e}")

print("\n--- 4. Testing Unified Insights (REST) ---")
if not api_key or "YOUR_GEMINI" in api_key:
     print("Skipping unified insights test due to invalid key.")
else:
    try:
        dummy_history = [{"title": "Inception", "status": "watched"}]
        dummy_ratings = [{"title": "The Matrix", "rating": 5}]
        dummy_subs = ["Netflix"]
        dummy_prefs = {"target_budget": 50, "target_currency": "USD"}
        
        result = ai_client.generate_unified_insights(
            dummy_history, dummy_ratings, dummy_subs, dummy_prefs, country="US"
        )
        
        if result and "picks" in result:
            print("SUCCESS: Retrieved Unified Insights!")
            print(f"Picks Count: {len(result['picks'])}")
            print(f"Strategy Count: {len(result.get('strategy', []))}")
        else:
            print(f"FAILURE: Result is {result}")
            if not result:
                print("Check logs for details.")

    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()

print("\n--- 5. Testing Insights Logic ---")
if not api_key or "YOUR_GEMINI" in api_key:
     print("Skipping logic test.")
else:
    # Mock data
    history = [{"title": "Inception", "status": "watched"}]
    ratings = [{"title": "Inception", "rating": 5}]
    subs = ["Netflix"]
    prefs = {"target_budget": 50, "target_currency": "USD"}
    
    print("Calling generate_unified_insights...")
    try:
        # call the function
        result = ai_client.generate_unified_insights(history, ratings, subs, prefs, country="US")
        
        if result:
            print("SUCCESS! Result generated.")
            print(json.dumps(result, indent=2))
        else:
            print("FAILURE: Result is None/Empty.")
            
    except Exception as e:
        print(f"LOGIC ERROR: {e}")
        import traceback
        traceback.print_exc()
