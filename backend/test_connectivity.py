
import requests
import time

def test_url(url, name):
    print(f"Testing {name} ({url})...")
    start = time.time()
    try:
        response = requests.get(url, timeout=5)
        print(f"  [SUCCESS] Status: {response.status_code}, Time: {time.time() - start:.2f}s")
        return True
    except Exception as e:
        print(f"  [FAILURE] Error: {e}")
        return False

if __name__ == "__main__":
    print("--- Network Connectivity Test ---")
    test_url("https://www.google.com", "Google")
    test_url("https://api.themoviedb.org/3/configuration?api_key=INVALID_KEY", "TMDB API (Ping)")
