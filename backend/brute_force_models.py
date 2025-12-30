import google.generativeai as genai
from config import settings
import logging

logging.basicConfig(level=logging.ERROR) # clean output

print(f"GenAI SDK Version: {genai.__version__}")

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY, transport="rest")
    
    # Extensive candidate list
    candidates = [
        "gemini-1.5-flash",
        "models/gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "models/gemini-1.5-flash-latest",
        "gemini-1.5-flash-001", 
        "models/gemini-1.5-flash-001",
        "gemini-1.5-flash-002",
        "models/gemini-1.5-flash-002",
        "gemini-1.5-pro",
        "models/gemini-1.5-pro",
        "gemini-pro",
        "models/gemini-pro",
        "gemini-2.0-flash-exp",
        "models/gemini-2.0-flash-exp"
    ]

    print("\n--- Starting Brute Force Check ---")
    
    success_model = None

    for model_name in candidates:
        try:
            # print(f"Testing: {model_name}...", end=" ")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content("Hi", generation_config={"response_mime_type": "text/plain"})
            if response and response.text:
                print(f"\n[SUCCESS] >>> {model_name} <<< WORKED!")
                print(f"Response: {response.text.strip()}")
                success_model = model_name
                break # Stop at first success
            else:
                print(f"[FAIL] {model_name} (Empty)")
        except Exception as e:
            # print(f"[FAIL] {model_name}: {str(e)[:50]}...")
            pass
            
    if not success_model:
        print("\n[COMPLETE FAILURE] No models worked.")
    else:
        print(f"\nRecommended Model String: {success_model}")

else:
    print("No API Key")
