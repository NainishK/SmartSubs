import tmdb_client
import logging
import json

# Setup basic logging to see errors
logging.basicConfig(level=logging.INFO)

def test_tmdb():
    queries = ["Mindhunter", "The Boys", "Severance", "Severance: Season 2"]
    
    print("--- Testing TMDB Client ---")
    for q in queries:
        print(f"\nSearching for: '{q}'")
        try:
            results = tmdb_client.search_multi(q)
            if results and results.get('results'):
                first = results['results'][0]
                print(f"SUCCESS: Found {len(results.get('results', []))} results")
                print(f"Top Match: {first.get('title') or first.get('name')} ({first.get('media_type')})")
                print(f"Poster: {first.get('poster_path')}")
            else:
                print("FAILURE: No results found.")
                print(f"Raw Response: {json.dumps(results, indent=2)}")
        except Exception as e:
            print(f"EXCEPTION: {e}")

if __name__ == "__main__":
    test_tmdb()
