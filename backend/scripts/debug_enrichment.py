
import tmdb_client
from config import settings
import sys

def test_enrichment():
    print(f"--- Debugging Enrichment ---")
    print(f"API Key Loaded: {'Yes' if settings.TMDB_API_KEY and settings.TMDB_API_KEY != 'YOUR_TMDB_API_KEY_HERE' else 'NO'}")
    
    title = "The Expanse"
    print(f"\n1. Searching TMDB for '{title}'...")
    
    try:
        results = tmdb_client.search_multi(title)
        print(f"   Raw Result Type: {type(results)}")
        print(f"   Raw Result Keys: {results.keys() if isinstance(results, dict) else 'Not a dict'}")
        
        items = results.get("results", [])
        print(f"   Items Found: {len(items)}")
        
        if items:
            first = items[0]
            print(f"   First Match: {first.get('name') or first.get('title')} (ID: {first.get('id')})")
            print(f"   Media Type: {first.get('media_type')}")
        else:
            print("   !!! NO MATCHES FOUND. This causes fallback UI.")
            
    except Exception as e:
        print(f"   !!! EXCEPTION: {e}")

if __name__ == "__main__":
    test_enrichment()
