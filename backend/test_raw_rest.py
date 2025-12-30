import requests
import json
from config import settings

api_key = settings.GEMINI_API_KEY
if not api_key:
    print("No API Key")
    exit()

models_to_test = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-pro",
    "gemini-1.0-pro"
]
versions = ["v1beta", "v1"]

headers = {
    'Content-Type': 'application/json'
}

data = {
    "contents": [{
        "parts": [{"text": "Explain how AI works"}]
    }]
}

print(f"Testing Raw REST API Loop...")

success = False
for version in versions:
    for model in models_to_test:
        url = f"https://generativelanguage.googleapis.com/{version}/models/{model}:generateContent?key={api_key}"
        print(f"Trying: {version} / {model} ...")
        try:
            response = requests.post(url, headers=headers, json=data)
            if response.status_code == 200:
                print(f"SUCCESS! Found working combo: {version} / {model}")
                print(f"Response: {response.text[:100]}")
                success = True
                break
            else:
                print(f"Failed ({response.status_code}): {response.text[:100]}")
        except Exception as e:
            print(f"Error: {e}")
            
    if success: break
