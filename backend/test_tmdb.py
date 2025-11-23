import requests
from config import settings
import os

print(f"Current Working Directory: {os.getcwd()}")
print(f"TMDB_API_KEY from settings: {settings.TMDB_API_KEY}")

TMDB_BASE_URL = "https://api.themoviedb.org/3"

def test_search(query):
    url = f"{TMDB_BASE_URL}/search/multi"
    params = {
        "api_key": settings.TMDB_API_KEY,
        "query": query,
        "include_adult": False
    }
    try:
        print(f"Sending request to {url} with params: {params}")
        response = requests.get(url, params=params)
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text}")
        response.raise_for_status()
        data = response.json()
        print(f"Found {len(data.get('results', []))} results.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_search("Inception")
