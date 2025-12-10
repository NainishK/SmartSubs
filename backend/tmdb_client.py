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
    
    # Try up to 3 times with exponential backoff
    max_retries = 3
    for attempt in range(max_retries):
        try:
            print(f"Searching TMDB for: {query} with Key: {settings.TMDB_API_KEY[:5]}... (Attempt {attempt + 1}/{max_retries})")
            response = requests.get(url, params=params, timeout=10)
            print(f"TMDB Response Status: {response.status_code}")
            response.raise_for_status()
            data = response.json()
            print(f"TMDB Results Count: {len(data.get('results', []))}")
            return data
        except requests.exceptions.ConnectionError as e:
            print(f"Connection error on attempt {attempt + 1}: {e}")
            if attempt < max_retries - 1:
                import time
                wait_time = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                print(f"Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                print(f"Max retries reached. Error fetching from TMDB: {e}")
                return {"results": []}
        except requests.exceptions.Timeout as e:
            print(f"Timeout error: {e}")
            return {"results": []}
        except Exception as e:
            print(f"Error fetching from TMDB: {e}")
            return {"results": []}
    
    return {"results": []}

def get_watch_providers(media_type: str, tmdb_id: int):
    """
    Fetch watch providers for a movie or TV show.
    Defaults to US region for now.
    """
    if settings.TMDB_API_KEY == "YOUR_TMDB_API_KEY_HERE":
        return {}

    url = f"{TMDB_BASE_URL}/{media_type}/{tmdb_id}/watch/providers"
    params = {"api_key": settings.TMDB_API_KEY}
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.get(url, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            # Return US providers or empty dict
            return data.get("results", {}).get("US", {})
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            if attempt < max_retries - 1:
                import time
                time.sleep(1)
                continue
            print(f"Error fetching providers for {media_type}/{tmdb_id}: {e}")
        except Exception as e:
            print(f"Error fetching providers for {media_type}/{tmdb_id}: {e}")
            break
            
    return {}

def get_similar(media_type: str, tmdb_id: int):
    """
    Fetch similar movies or TV shows for a given item.
    """
    if settings.TMDB_API_KEY == "YOUR_TMDB_API_KEY_HERE":
        return {"results": []}

    url = f"{TMDB_BASE_URL}/{media_type}/{tmdb_id}/similar"
    params = {"api_key": settings.TMDB_API_KEY, "page": 1}
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        return data
    except Exception as e:
        print(f"Error fetching similar content for {media_type}/{tmdb_id}: {e}")
        return {"results": []}

def get_details(media_type: str, tmdb_id: int):
    """Fetch full details including genres."""
    url = f"{TMDB_BASE_URL}/{media_type}/{tmdb_id}"
    params = {"api_key": settings.TMDB_API_KEY}
    try:
        response = requests.get(url, params=params, timeout=5)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"Error fetching details: {e}")
    return {}

def discover_media(media_type: str, with_genres: str = None, sort_by: str = "popularity.desc", min_vote_count: int = 100, min_vote_average: float = 0, with_watch_providers: str = None, watch_region: str = "US"):
    """Discover media with advanced filters."""
    url = f"{TMDB_BASE_URL}/discover/{media_type}"
    params = {
        "api_key": settings.TMDB_API_KEY,
        "sort_by": sort_by,
        "vote_count.gte": min_vote_count,
        "vote_average.gte": min_vote_average,
        "include_adult": False,
        "language": "en-US",
        "page": 1
    }
    if with_genres:
        params["with_genres"] = with_genres
    if with_watch_providers:
        params["with_watch_providers"] = with_watch_providers
        params["watch_region"] = watch_region
        
    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"Error discovering media: {e}")
    return {"results": []}
