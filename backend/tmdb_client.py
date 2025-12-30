import requests
from config import settings

TMDB_BASE_URL = "https://api.themoviedb.org/3"

def search_multi(query: str):
    if not settings.TMDB_API_KEY or settings.TMDB_API_KEY == "YOUR_TMDB_API_KEY_HERE":
        return {"results": []}
    
    url = f"{TMDB_BASE_URL}/search/multi"
    params = {
        "api_key": settings.TMDB_API_KEY,
        "query": query,
        "include_adult": False
    }
    headers = {
        "User-Agent": "SubscriptionManager/1.0",
        "Accept": "application/json"
    }
    
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.get(url, params=params, headers=headers, timeout=10, verify=False)
            # response.raise_for_status() # Let's be lenient like raw script
            
            if response.status_code == 200:
                data = response.json()
                # Basic filtering for safety
                results = data.get("results", [])
                filtered = [
                    r for r in results 
                    if r.get("media_type") in ["movie", "tv"]
                ]
                return {"results": filtered}
            else:
                print(f"TMDB Error {response.status_code}: {response.text}")
                return {"results": []}
                
        except Exception as e:
            print(f"TMDB Exception (Attempt {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                import time
                time.sleep(1)
                continue
            return {"results": []}

def get_watch_providers(media_type: str, tmdb_id: int, region: str = "US"):
    """
    Fetch watch providers for a movie or TV show.
    Defaults to US region.
    """
    if settings.TMDB_API_KEY == "YOUR_TMDB_API_KEY_HERE":
        return {}

    url = f"{TMDB_BASE_URL}/{media_type}/{tmdb_id}/watch/providers"
    params = {"api_key": settings.TMDB_API_KEY}
    
    headers = {
        "User-Agent": "SubscriptionManager/1.0",
        "Accept": "application/json"
    }
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.get(url, params=params, headers=headers, timeout=5, verify=False)
            response.raise_for_status()
            data = response.json()
            # Return providers for the specified region or empty dict
            return data.get("results", {}).get(region, {})
        except requests.exceptions.RequestException as e:
             # Retry on all request errors
            if attempt < max_retries - 1:
                import time
                wait_time = 1 * (attempt + 1)
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
    
    headers = {
        "User-Agent": "SubscriptionManager/1.0",
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, params=params, headers=headers, verify=False)
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
    headers = {
        "User-Agent": "SubscriptionManager/1.0",
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, params=params, headers=headers, timeout=5, verify=False)
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
        
    headers = {
        "User-Agent": "SubscriptionManager/1.0",
        "Accept": "application/json"
    }
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.get(url, params=params, headers=headers, timeout=10, verify=False)
            if response.status_code == 200:
                return response.json()
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                import time
                time.sleep(1)
                continue
            print(f"Error discovering media (Attempt {attempt+1}): {e}")
        except Exception as e:
            print(f"Error discovering media: {e}")
            break
    return {"results": []}
