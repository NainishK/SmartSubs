import os
import requests
import json
from dotenv import load_dotenv

# Explicitly load from backend/.env
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(backend_dir, ".env")
load_dotenv(env_path)

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ ERROR: GEMINI_API_KEY not found in .env")
    exit(1)

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

print(f"🔍 Querying Gemini API Models...")
print(f"URL: {url.replace(api_key, 'HIDDEN')}")

try:
    response = requests.get(url, timeout=10)
    if response.status_code == 200:
        data = response.json()
        print("\n✅ AVAILABLE MODELS:")
        found_any = False
        if "models" in data:
            for m in data["models"]:
                if "generateContent" in m.get("supportedGenerationMethods", []):
                    print(f"   - {m['name']} (Version: {m.get('version')})")
                    found_any = True
        
        if not found_any:
            print("   ⚠️  No models found with 'generateContent' support.")
            print("   Full Response:", json.dumps(data, indent=2))
    else:
        print(f"\n❌ API Request Failed: {response.status_code}")
        print(response.text)

except Exception as e:
    print(f"\n❌ Connection Error: {e}")
