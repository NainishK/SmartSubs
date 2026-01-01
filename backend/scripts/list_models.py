import google.generativeai as genai
from config import settings
import os

print(f"Key configured: {bool(settings.GEMINI_API_KEY)}")
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    try:
        print("Listing models...")
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"- {m.name}")
    except Exception as e:
        print(f"Error: {e}")
