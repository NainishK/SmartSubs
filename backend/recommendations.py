import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import models
import tmdb_client
import random

# Estimated costs for common services (since TMDB doesn't provide this)
PROVIDER_COSTS = {
    "Netflix": 15.49,
    "Hulu": 7.99,
    "Amazon Prime Video": 14.99,
    "Disney Plus": 7.99,
    "Max": 15.99,
    "Peacock": 4.99,
    "Apple TV Plus": 6.99,
    "Paramount Plus": 5.99
}

def get_cached_data(db: Session, user_id: int, category: str):
    """Retrieve valid cached data if it exists and is fresh (< 24 hours)."""
    cache_entry = db.query(models.RecommendationCache).filter(
        models.RecommendationCache.user_id == user_id,
        models.RecommendationCache.category == category
    ).first()
    
    if cache_entry:
        if cache_entry.updated_at:
             try:
                 return json.loads(cache_entry.data)
             except:
                 return None
    return None

def set_cached_data(db: Session, user_id: int, category: str, data: list):
    """Save data to cache."""
    json_data = json.dumps(data)
    cache_entry = db.query(models.RecommendationCache).filter(
        models.RecommendationCache.user_id == user_id,
        models.RecommendationCache.category == category
    ).first()
    
    if cache_entry:
        cache_entry.data = json_data
    else:
        cache_entry = models.RecommendationCache(
            user_id=user_id,
            category=category,
            data=json_data
        )
        db.add(cache_entry)
    
    db.commit()

def refresh_recommendations(db: Session, user_id: int, force: bool = False, category: str = None):
    """
    Background task to re-calculate and cache all recommendations.
    If force is False, only refreshes if cache is missing or older than 24 hours.
    category: 'dashboard' or 'similar' (None = both)
    """
    print(f"--- [REFRESH] Checking recommendations for user {user_id} (force={force}, cat={category}) ---")
    try:
        # 1. Refresh Dashboard (Trending/Watch Now)
        if category in [None, "dashboard"]:
            should_refresh = force
            if not force:
                cache_entry = db.query(models.RecommendationCache).filter(
                    models.RecommendationCache.user_id == user_id,
                    models.RecommendationCache.category == "dashboard"
                ).first()
                if not cache_entry or not cache_entry.updated_at or \
                   (datetime.now(cache_entry.updated_at.tzinfo) - cache_entry.updated_at > timedelta(hours=24)):
                    should_refresh = True
            
            if should_refresh:
                print(f"[REFRESH] Recalculating Dashboard for user {user_id}...")
                dashboard_recs = calculate_dashboard_recommendations(db, user_id)
                set_cached_data(db, user_id, "dashboard", dashboard_recs)

        # 2. Refresh Similar Content
        if category in [None, "similar"]:
            should_refresh = force
            if not force:
                cache_entry = db.query(models.RecommendationCache).filter(
                    models.RecommendationCache.user_id == user_id,
                    models.RecommendationCache.category == "similar"
                ).first()
                if not cache_entry or not cache_entry.updated_at or \
                   (datetime.now(cache_entry.updated_at.tzinfo) - cache_entry.updated_at > timedelta(hours=24)):
                    should_refresh = True
            
            if should_refresh:
                print(f"[REFRESH] Recalculating Similar Content for user {user_id}...")
                similar_recs = calculate_similar_content(db, user_id)
                set_cached_data(db, user_id, "similar", similar_recs)
        
        print(f"--- [REFRESH] Completed for user {user_id} ---")
    except Exception as e:
        print(f"[REFRESH] FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()

def get_dashboard_recommendations(db: Session, user_id: int):
    """
    Fast recommendations: Watch Now (on your subs) and Cancel (unused subs).
    Tries cache first, then calculates if missing.
    """
    cached = get_cached_data(db, user_id, "dashboard")
    if cached is not None:
        # Smart Validation: If we have 0 trending items, assume cache is stale/broken and recalc
        trending_count = sum(1 for r in cached if r.get("type") == "trending")
        if trending_count > 0:
            return cached
        print(f"Invalidating Dashboard Cache (Trending count: {trending_count})")
        
    # Calculate
    recs = calculate_dashboard_recommendations(db, user_id)
    
    if recs:
        set_cached_data(db, user_id, "dashboard", recs)
        
    return recs

def calculate_dashboard_recommendations(db: Session, user_id: int):
    # 0. Get User Context (Country)
    user = db.query(models.User).filter(models.User.id == user_id).first()
    country = user.country if user and user.country else "US"

    # 1. Get User's Watchlist (Filter out 'watched' - only show actionable items)
    watchlist_query = db.query(models.WatchlistItem).filter(models.WatchlistItem.user_id == user_id).all()
    # IDs to exclude from recommendations (everything the user has interacted with)
    exclude_ids = {item.tmdb_id for item in watchlist_query}
    
    # Active watchlist for "Your Watchlist" section logic (if needed, though dashboard mainly uses this for filtering too? No, wait)
    # Actually, we should exclude everything in watchlist_query from being recommended again.
    watchlist = [item for item in watchlist_query if item.status in ['plan_to_watch', 'watching']]
    
    # 2. Get User's Active OTT Subscriptions
    subscriptions = db.query(models.Subscription).filter(
        models.Subscription.user_id == user_id,
        models.Subscription.is_active == True,
        models.Subscription.category == 'OTT'
    ).all()
    
    if not watchlist and not subscriptions:
        return []

    # Helper to get logo
    def get_service_logo(name, user_country):
        service = db.query(models.Service).filter(
            models.Service.name == name,
            ((models.Service.country == user_country) | (models.Service.country == "US"))
        ).order_by(models.Service.country == user_country).first()
        return service.logo_url if service else None
    
    # Initialize recommendations list
    recommendations = []

    # A. "Watch Now" - Show items available on current subscriptions (Deduplicated)
    service_watch_list = {} 
    useful_subscriptions = set()
    seen_items = set() # Track items to prevent duplicates across services

    # Initialize lists for all services
    for sub in subscriptions:
        service_watch_list[sub.service_name] = []

    # Process items
    for item in watchlist:
        if item.title in seen_items:
            continue
            
        providers = tmdb_client.get_watch_providers(item.media_type, item.tmdb_id, region=country)
        if "flatrate" in providers:
            potential_services = []
            
            # Find all valid services for this item
            # Find all valid services for this item
            for provider in providers["flatrate"]:
                p_name = provider["provider_name"]
                p_id = str(provider["provider_id"])
                
                for sub in subscriptions:
                    # Robust Match Logic (Same as Trending)
                    is_match = False
                    
                    # 1. Check ID Map
                    s_name_key = sub.service_name.lower()
                    
                    # Normalize key for map lookup
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
                    
                    mapped_ids = []
                    # Find correct map key
                    if s_name_key in PROVIDER_IDS_MAP:
                        mapped_ids = PROVIDER_IDS_MAP[s_name_key].split("|")
                    else:
                        for k, v in PROVIDER_IDS_MAP.items():
                             if k in s_name_key or s_name_key in k:
                                 mapped_ids = v.split("|")
                                 break
                    
                    if p_id in mapped_ids:
                        is_match = True
                    # 2. Fallback to Name Match
                    elif sub.service_name.lower() in p_name.lower() or p_name.lower() in sub.service_name.lower():
                        is_match = True
                        
                    if is_match:
                        potential_services.append(sub)
            
            if potential_services:
                # Load Balancing Strategy:
                # Assign to the service that currently has the FEWEST items
                target_sub = min(potential_services, key=lambda s: len(service_watch_list[s.service_name]))
                
                useful_subscriptions.add(target_sub.id)
                service_watch_list[target_sub.service_name].append(item.title)
                seen_items.add(item.title)

    # Add "Watch Now" recommendations
    for service_name, items in service_watch_list.items():
        if items:
            recommendations.append({
                "type": "watch_now",
                "service_name": service_name,
                "logo_url": get_service_logo(service_name, country),
                "items": items[:5], # Limit to 5
                "reason": f"Included in your {service_name} subscription",
                "cost": 0,
                "savings": 0,
                "score": 100 + len(items)
            })

    # B. "Cancel Unused" - Suggest cancelling subscriptions that cover NO watchlist items
    for sub in subscriptions:
        if sub.id not in useful_subscriptions:
            recommendations.append({
                "type": "cancel",
                "service_name": sub.service_name,
                "logo_url": get_service_logo(sub.service_name, country),
                "items": [],
                "reason": "No watchlist items found",
                "cost": 0,
                "savings": sub.cost,
                "score": 50 + sub.cost
            })

    # C. "Trending" - Popular items on your services
    # Map subscription IDs for efficient discovery
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
        "jiohotstar": "122|220" # Covering bases for the merger
    }
    
    valid_provider_ids = set()
    for sub in subscriptions:
        key = sub.service_name.lower()
        if key in PROVIDER_IDS_MAP:
            valid_provider_ids.add(PROVIDER_IDS_MAP[key])
        else:
            for k, v in PROVIDER_IDS_MAP.items():
                if k in key or key in k:
                    valid_provider_ids.add(v)
                    
    provider_string = "|".join(valid_provider_ids) if valid_provider_ids else None
    
    trending_recs = []
    if provider_string:
        try:
            # Fetch Movies
            data_movies = tmdb_client.discover_media(
                "movie",
                sort_by="popularity.desc",
                min_vote_count=500,
                with_watch_providers=provider_string,
                watch_region=country
            )
            print(f"[DEBUG] Trending FETCH Movies: {len(data_movies.get('results', []))} items")
            movies = data_movies.get("results", [])[:20]
            
            # Fetch TV Shows
            data_tv = tmdb_client.discover_media(
                "tv",
                sort_by="popularity.desc",
                min_vote_count=500,
                with_watch_providers=provider_string,
                watch_region=country
            )
            print(f"[DEBUG] Trending FETCH TV: {len(data_tv.get('results', []))} items")
            shows = data_tv.get("results", [])[:20]
            
            # Interleave (Movie, TV, Movie, TV)
            combined_candidates = []
            for i in range(max(len(movies), len(shows))):
                if i < len(movies): combined_candidates.append({**movies[i], "media_type": "movie"})
                if i < len(shows): combined_candidates.append({**shows[i], "media_type": "tv"})
            
            print(f"[DEBUG] Trending candidates pool size: {len(combined_candidates)}")
            
            count = 0 
            seen_trending_titles = set()
            
            for item in combined_candidates:
                if count >= 15: break
                tmdb_id = item.get("id")
                title = item.get("title") or item.get("name") # Handle TV name
                
                if tmdb_id in exclude_ids: continue
                if title in seen_trending_titles: continue

                # Find which service has it
                providers = tmdb_client.get_watch_providers(item.get("media_type"), tmdb_id, region=country)
                matched_sub = None
                
                # Shuffle subscriptions to avoid favoring the first one (e.g. Netflix) for multi-platform content
                import random
                shuffled_subs = list(subscriptions)
                random.shuffle(shuffled_subs)
                
                if "flatrate" in providers:
                    flatrate_ids = [str(p["provider_id"]) for p in providers["flatrate"]]
                    for sub in shuffled_subs:
                        # Normalize service name for mapping
                        s_name = sub.service_name.lower().replace(" ", "")
                        
                        # Check distinct mapping first
                        mapped_ids = []
                        for key, val in PROVIDER_IDS_MAP.items():
                            if key.replace(" ", "") in s_name:
                                mapped_ids = val.split("|")
                                break
                        
                        if any(pid in flatrate_ids for pid in mapped_ids):
                            matched_sub = sub.service_name
                            break
                
                if matched_sub:
                    recommendations.append({
                        "type": "trending",
                        "service_name": matched_sub,
                        "logo_url": get_service_logo(matched_sub, country),
                        "items": [title],
                        "reason": f"Trending", # Simplified reason
                        "cost": 0,
                        "savings": 0,
                        "score": 95 + (item.get("popularity", 0) / 100),
                        "tmdb_id": tmdb_id,
                        "media_type": item.get("media_type"),
                        "poster_path": item.get("poster_path"),
                        "vote_average": item.get("vote_average"),
                        "overview": item.get("overview")
                    })
                    seen_trending_titles.add(title)
                    count += 1
        except Exception as e:
            print(f"Error fetching trending: {e}")
            
        except Exception as e:
            print(f"Error fetching trending: {e}")
            
    # Sort by Score
    recommendations.sort(key=lambda x: x["score"], reverse=True)
    return recommendations

def get_similar_content(db: Session, user_id: int):
    # ... logic ...
    # (Leaving get_similar_content signature line in targeting to ensure match)
    
    # Need to target the END of get_similar_content for the limit change
    # I'll do this in a separate chunk or just target the return line if possible.
    # Actually, the file content of get_similar_content was seen previously ending with return unique_candidates[:6]
    pass # Replaced by actual edit in next tool call or finding better range.
    """
    Slow recommendations: Similar content based on watched history.
    Tries cache first, then calculates if missing.
    """
    cached = get_cached_data(db, user_id, "similar")
    if cached is not None:
        return cached

    # Calculate
    recs = calculate_similar_content(db, user_id)
    
    if recs:
        set_cached_data(db, user_id, "similar", recs)
        
    return recs

def calculate_similar_content(db: Session, user_id: int):
    # 0. Get User Context (Country)
    user = db.query(models.User).filter(models.User.id == user_id).first()
    country = user.country if user and user.country else "US"

    def get_service_logo(name, user_country):
        service = db.query(models.Service).filter(
            models.Service.name == name,
            ((models.Service.country == user_country) | (models.Service.country == "US"))
        ).order_by(models.Service.country == user_country).first()
        return service.logo_url if service else None

    watchlist = db.query(models.WatchlistItem).filter(models.WatchlistItem.user_id == user_id).all()
    subscriptions = db.query(models.Subscription).filter(
        models.Subscription.user_id == user_id,
        models.Subscription.is_active == True,
        models.Subscription.category == 'OTT'
    ).all()
    
    if not subscriptions:
        return []

    recommendations = []
    recommended_ids = set()
    
    # --- Strategy A: Interest Discovery (Top Genres) ---
    interests = db.query(models.UserInterest).filter(models.UserInterest.user_id == user_id).order_by(models.UserInterest.score.desc()).limit(2).all()
    
    # FALLBACK: If no explicit interests, derive from Watchlist or Default
    if not interests:
        from collections import Counter
        
        # Gather all genres from watchlist
        genre_counter = Counter()
        for w in watchlist:
            if w.genre_ids:
                try:
                    g_ids = json.loads(w.genre_ids)
                    if isinstance(g_ids, list):
                        genre_counter.update(g_ids)
                except: pass
        
        # If we found genres, use top 2
        if genre_counter:
            top_genes = genre_counter.most_common(2) # [(id, count), ...]
            class MockInterest:
                def __init__(self, gid): self.genre_id = gid
            interests = [MockInterest(g[0]) for g in top_genes]
        else:
            # Absolute fallback: Action (28) and Comedy (35)
            class MockInterest:
                def __init__(self, gid): self.genre_id = gid
            interests = [MockInterest(28), MockInterest(35)]
    
    # Map subscription IDs for efficient discovery
    PROVIDER_IDS_MAP = {
        "netflix": "8",
        "hulu": "15", 
        "amazon prime video": "9",
        "disney plus": "337",
        "max": "384|312",
        "peacock": "386",
        "apple tv plus": "350",
        "paramount plus": "83|531"
    }
    
    valid_provider_ids = set()
    for sub in subscriptions:
        key = sub.service_name.lower()
        if key in PROVIDER_IDS_MAP:
            valid_provider_ids.add(PROVIDER_IDS_MAP[key])
        else:
            # Try fuzzy match?
            for k, v in PROVIDER_IDS_MAP.items():
                if k in key or key in k:
                    valid_provider_ids.add(v)
                    
    provider_string = "|".join(valid_provider_ids) if valid_provider_ids else None
    
    available_recs = []
    explore_recs = []
    
    for interest in interests:
        # 1. Available Content Query
        data_avail = tmdb_client.discover_media(
            "movie", 
            with_genres=str(interest.genre_id), 
            sort_by="vote_average.desc", 
            min_vote_count=200, 
            min_vote_average=6.0,
            with_watch_providers=provider_string,
            watch_region=country
        )
        
        # Process Available Candidates
        items = data_avail.get("results", [])[:20]
        random.shuffle(items)
        
        count = 0
        for item in items:
            if count >= 6: break 
            tmdb_id = item.get("id")
            if tmdb_id in recommended_ids: continue
            if any(w.tmdb_id == tmdb_id for w in watchlist): continue
            
            providers = tmdb_client.get_watch_providers("movie", tmdb_id, region=country)
            matched_sub = None
            if "flatrate" in providers:
                for p in providers["flatrate"]:
                    for sub in subscriptions:
                        if sub.service_name.lower() in p["provider_name"].lower():
                            matched_sub = sub.service_name
                            break
                    if matched_sub: break
            
            if matched_sub:
                available_recs.append({
                    "type": "discovery",
                    "service_name": matched_sub,
                    "logo_url": get_service_logo(matched_sub, country),
                    "items": [item.get("title")],
                    "reason": "Included in your subscription",
                    "score": 90 + item.get("vote_average", 0),
                    "tmdb_id": tmdb_id,
                    "media_type": "movie",
                    "poster_path": item.get("poster_path"),
                    "vote_average": item.get("vote_average"),
                    "overview": item.get("overview")
                })
                recommended_ids.add(tmdb_id)
                count += 1

        data_explore = tmdb_client.discover_media(
            "movie",
            with_genres=str(interest.genre_id),
            sort_by="vote_average.desc",
            min_vote_count=500,
            min_vote_average=7.0,
            watch_region=country
        )
        items_explore = data_explore.get("results", [])[:15]
        
        for item in items_explore:
            tmdb_id = item.get("id")
            if tmdb_id in recommended_ids: continue
            if any(w.tmdb_id == tmdb_id for w in watchlist): continue
            
            providers = tmdb_client.get_watch_providers("movie", tmdb_id, region=country)
            external_service = None
            on_existing = False
            
            if "flatrate" in providers:
                for p in providers["flatrate"]:
                    p_name = p["provider_name"]
                    for sub in subscriptions:
                        if sub.service_name.lower() in p_name.lower():
                            on_existing = True
                            break
                    if on_existing: break
                    
                    p_name_lower = p_name.lower()
                    if any(s in p_name_lower for s in ["netflix", "hulu", "amazon", "disney", "max", "apple", "peacock", "paramount"]):
                         external_service = p_name
                         break
            
            if not on_existing and external_service:
                explore_recs.append({
                    "type": "discovery_explore",
                    "service_name": external_service,
                    "logo_url": get_service_logo(external_service, country),
                    "items": [item.get("title")],
                    "reason": f"Available on {external_service}",
                    "score": 88 + item.get("vote_average", 0),
                    "tmdb_id": tmdb_id,
                    "media_type": "movie",
                    "poster_path": item.get("poster_path"),
                    "vote_average": item.get("vote_average"),
                    "overview": item.get("overview")
                })

    # --- Strategy B: Similar Content ---
    seeds = []
    for w in watchlist:
        weight = (w.user_rating * 2) if w.user_rating else (5 if w.status == "watched" else 3)
        seeds.append((w, weight))
    seeds.sort(key=lambda x: x[1], reverse=True)
    top_seeds = [s[0] for s in seeds[:6]]
    random.shuffle(top_seeds)
    
    similar_recs = []
    for seed in top_seeds:
        if len(similar_recs) >= 6: break
        
        sim_data = tmdb_client.get_similar(seed.media_type, seed.tmdb_id)
        candidates = [c for c in sim_data.get("results", []) if c.get("vote_average", 0) >= 6.0]
        random.shuffle(candidates)
        
        for sim in candidates:
            sim_id = sim.get("id")
            if sim_id in recommended_ids: continue
            if any(w.tmdb_id == sim_id for w in watchlist): continue
             
            providers = tmdb_client.get_watch_providers(seed.media_type, sim_id, region=country)
            matched_sub = None
            if "flatrate" in providers:
                for p in providers["flatrate"]:
                    for sub in subscriptions:
                        if sub.service_name.lower() in p["provider_name"].lower():
                            matched_sub = sub.service_name
                            break
                    if matched_sub: break
            
            if matched_sub:
                similar_recs.append({
                    "type": "similar",
                    "service_name": matched_sub,
                    "logo_url": get_service_logo(matched_sub, country),
                    "items": [sim.get("title") or sim.get("name")],
                    "reason": f"Because you liked {seed.title}",
                    "score": 75 + sim.get("vote_average", 0),
                    "tmdb_id": sim_id,
                    "media_type": seed.media_type,
                    "poster_path": sim.get("poster_path"),
                    "vote_average": sim.get("vote_average"),
                    "overview": sim.get("overview")
                })
                recommended_ids.add(sim_id)
                break 

                recommended_ids.add(sim_id)
                break 

    # --- Clustering Explore Recs ---
    service_counts = {}
    for r in explore_recs:
        s = r["service_name"]
        service_counts[s] = service_counts.get(s, 0) + 1
        
    best_external_service = None
    if service_counts:
        best_external_service = max(service_counts, key=service_counts.get)
    
    final_explore = []
    if best_external_service:
        final_explore = [r for r in explore_recs if r["service_name"] == best_external_service][:2]
        for r in final_explore:
            recommended_ids.add(r["tmdb_id"])

    # Combine
    current_pool = available_recs + similar_recs
    random.shuffle(current_pool)
    
    all_candidates = current_pool + final_explore
    
    unique_candidates = []
    seen = set()
    for c in all_candidates:
        if c["tmdb_id"] not in seen:
            unique_candidates.append(c)
            seen.add(c["tmdb_id"])
            
    random.shuffle(unique_candidates)
    
    return unique_candidates[:8]
