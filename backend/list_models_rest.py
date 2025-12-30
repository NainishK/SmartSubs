import requests
from config import settings
import json

def list_models():
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        print("No API Key")
        return

    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            models = data.get('models', [])
            print(f"Found {len(models)} models.")
            with open("valid_models.txt", "w") as f:
                for m in models:
                    name = m.get('name', '')
                    if 'gemini' in name and 'generateContent' in m.get('supportedGenerationMethods', []):
                        f.write(name.replace('models/', '') + "\n")
            print("Models written to valid_models.txt")
        else:
            print(f"Error {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    list_models()
