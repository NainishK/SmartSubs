import requests
from config import settings
import json

def test_raw_tmdb():
    api_key = settings.TMDB_API_KEY
    if not api_key:
        print("No TMDB API Key set.")
        return

    base_url = "https://api.themoviedb.org/3/search/multi"
    query = "Mindhunter"
    params = {
        "api_key": api_key,
        "query": query,
        "include_adult": False
    }

    print(f"Requesting: {base_url}?query={query}&api_key=REDACTED")
    
    try:
        response = requests.get(base_url, params=params)
        print(f"Status Code: {response.status_code}")
        print("Response Headers:", response.headers)
        
        try:
            data = response.json()
            results = data.get('results', [])
            print(f"Got {len(results)} results.")
            for i, r in enumerate(results):
                print(f"Result {i}: Name='{r.get('title') or r.get('name')}', Type='{r.get('media_type')}'")
        except:
            print("Response Text (Not JSON):")
            print(response.text)
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_raw_tmdb()
