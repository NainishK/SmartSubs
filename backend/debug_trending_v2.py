import tmdb_client
import json

# Mock Subscription Class
class MockSub:
    def __init__(self, name):
        self.service_name = name
        self.id = 1

# Mock Inputs
country = "IN"
subscriptions = [
    MockSub("Netflix"),
    MockSub("Amazon Prime Video"),
    MockSub("JioHotstar"),  # The problematic one?
    MockSub("JioCinema Premium")
]

def debug_trending():
    print("--- Debugging Trending Logic ---")
    
    # 1. Build Provider String
    PROVIDER_IDS_MAP = {
        "netflix": "8",
        "hulu": "15", 
        "amazon prime video": "9",
        "disney plus": "337",
        "max": "384|312",
        "peacock": "386",
        "apple tv plus": "350",
        "paramount plus": "83|531",
        "crunchyroll": "283",
        "hotstar": "122",
        "disney+ hotstar": "122",
        "jiocinema": "220",
        "jiohotstar": "122|220"
    }
    
    valid_provider_ids = set()
    for sub in subscriptions:
        key = sub.service_name.lower()
        print(f"Processing Sub: {key}")
        
        match_found = False
        if key in PROVIDER_IDS_MAP:
            valid_provider_ids.add(PROVIDER_IDS_MAP[key])
            match_found = True
        else:
            for k, v in PROVIDER_IDS_MAP.items():
                if k in key or key in k:
                    valid_provider_ids.add(v)
                    match_found = True
        print(f"  -> Match Found: {match_found}")

    provider_string = "|".join(valid_provider_ids) if valid_provider_ids else None
    print(f"Provider String: {provider_string}")

    if not provider_string:
        print("ERROR: No providers mapped!")
        return

    # 2. Discover Media
    print("\n--- Discovering Media ---")
    try:
        data_movies = tmdb_client.discover_media(
            "movie",
            sort_by="popularity.desc",
            min_vote_count=500,
            with_watch_providers=provider_string,
            watch_region=country
        )
        movies = data_movies.get("results", [])[:5]
        print(f"Fetched {len(movies)} Movies")
        
        # 3. Match Logic Check
        print("\n--- Matching Logic Check ---")
        for item in movies:
            tmdb_id = item.get("id")
            title = item.get("title")
            print(f"Checking Item: {title} ({tmdb_id})")
            
            providers = tmdb_client.get_watch_providers("movie", tmdb_id, region=country)
            
            flatrate = providers.get("flatrate", [])
            provider_names = [p["provider_name"] for p in flatrate]
            print(f"  -> Creating Providers: {provider_names}")
            
            matched_sub = None
            if flatrate:
                for p in flatrate:
                    p_name = p["provider_name"]
                    # Logic from recommendations.py
                    for sub in subscriptions:
                         # Normalize service name for mapping (recreating the logic I saw in recommendations.py)
                        s_name = sub.service_name.lower().replace(" ", "")
                        
                        # Check distinct mapping first
                        mapped_ids = []
                        for key, val in PROVIDER_IDS_MAP.items():
                            if key.replace(" ", "") in s_name:
                                mapped_ids = val.split("|")
                                break
                        
                        # The PID check
                        pid = str(p["provider_id"])
                        if pid in mapped_ids:
                             matched_sub = sub.service_name
                             print(f"     -> MATCH! {p_name} (ID {pid}) matches {sub.service_name}")
                             break
                             
                        # The Name Fuzzy Match (Old logic but mixed in)
                        if sub.service_name.lower() in p_name.lower() or p_name.lower() in sub.service_name.lower():
                             matched_sub = sub.service_name
                             print(f"     -> Fuzzy MATCH! {p_name} matches {sub.service_name}")
                             break
                             
                    if matched_sub: break
            
            if matched_sub:
                print(f"  -> RESULT: KEPT (Service: {matched_sub})")
            else:
                print(f"  -> RESULT: DROPPED (No local subscription match)")

    except Exception as e:
        print(f"EXCEPTION: {e}")

if __name__ == "__main__":
    debug_trending()
