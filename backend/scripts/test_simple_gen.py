import google.generativeai as genai
from config import settings
import os
import logging

logging.basicConfig(level=logging.INFO)

print(f"GenAI Version: {genai.__version__}")

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY, transport="rest")
    
    candidates = [
        "gemini-1.5-flash",
        "models/gemini-1.5-flash",
        "gemini-1.5-flash-001",
        "models/gemini-1.5-flash-001",
        "gemini-1.5-flash-latest",
        "models/gemini-1.5-flash-latest",
        "gemini-pro",
        "models/gemini-pro"
    ]

    for model_name in candidates:
        print(f"\n--- Testing '{model_name}' ---")
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content("Say hello", generation_config={"response_mime_type": "text/plain"})
            if response and response.text:
                print(f"SUCCESS! Response: {response.text.strip()}")
                break
        except Exception as e:
            print(f"FAILED: {e}")
else:
    print("No API Key set")
