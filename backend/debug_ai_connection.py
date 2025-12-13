import google.generativeai as genai
from config import settings
import logging

# Setup basic logging to see output
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_connection():
    print(f"Checking API Key... {settings.GEMINI_API_KEY[:5]}... (Length: {len(settings.GEMINI_API_KEY)})")
    
    if settings.GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
        print("ERROR: API Key is still default placeholder!")
        return

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        print("Listing available models...")
        models_list = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f" - {m.name}")
                models_list.append(m.name)
        
        with open("models_log.txt", "w") as f:
            f.write("Available Models:\n")
            for m in models_list:
                f.write(f"{m}\n")
        print("Models logged to models_log.txt")
                
        print("\nTesting Generation with 'gemini-1.5-flash'...")
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content("Hello, can you hear me? Reply with 'Yes'")
        print(f"Response: {response.text}")
        
    except Exception as e:
        with open("error_log.txt", "w") as f:
            f.write(f"Error: {e}\n")
            import traceback
            traceback.print_exc(file=f)
        print("Error logged to error_log.txt")

if __name__ == "__main__":
    test_connection()
