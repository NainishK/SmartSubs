import requests
from config import settings

TMDB_BASE_URL = "https://api.themoviedb.org/3"

def search_multi(query: str):
    if settings.TMDB_API_KEY == "YOUR_TMDB_API_KEY_HERE":
        # Mock response if no key provided
        return {
            "results": [
                {
                    "id": 550,
                    "title": "Fight Club (Mock)",
                    "media_type": "movie",
                    "overview": "A ticking-time-bomb insomniac...",
                    "poster_path": None
                },
                {
                    "id": 1399,
                    "name": "Game of Thrones (Mock)",
                    "media_type": "tv",
                    "overview": "Seven noble families fight for control...",
                    "poster_path": None
                }
            ]
        }
    
    url = f"{TMDB_BASE_URL}/search/multi"
    params = {
        "api_key": settings.TMDB_API_KEY,
        "query": query,
        "include_adult": False
    }
    try:
        print(f"Searching TMDB for: {query} with Key: {settings.TMDB_API_KEY[:5]}...")
        response = requests.get(url, params=params)
        print(f"TMDB Response Status: {response.status_code}")
        response.raise_for_status()
        data = response.json()
        print(f"TMDB Results Count: {len(data.get('results', []))}")
        return data
    except Exception as e:
        print(f"Error fetching from TMDB: {e}")
        return {"results": []}
