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
            # print(f"Searching TMDB for: {query}... (Attempt {attempt + 1})") # Reduced logging
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            return data
        except requests.exceptions.RequestException as e:
            # Retry on all request errors (connection, timeout, 5xx, 429)
            # Check for 429 Too Many Requests specifically to wait longer?
            is_429 = False
            if isinstance(e, requests.exceptions.HTTPError) and e.response is not None and e.response.status_code == 429:
                is_429 = True
            
            if attempt < max_retries - 1:
                import time
                wait_time = (2 ** attempt) if not is_429 else (5) # Wait longer for 429
                print(f"TMDB Error ({e}). Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                print(f"Max retries searched. Error: {e}")
                return {"results": []}
        except Exception as e:
            print(f"Unexpected error: {e}")
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
        except requests.exceptions.RequestException as e:
             # Retry on all request errors
            if attempt < max_retries - 1:
                import time
                wait_time = 1 * (attempt + 1)
                # print(f"Retrying providers for {tmdb_id} in {wait_time}s...")
                time.sleep(wait_time)
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
