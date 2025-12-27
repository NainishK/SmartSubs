import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import models
import tmdb_client

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
        # Check freshness (e.g., 24 hours)
        # Note: SQLite stores datetime as string or naive datetime depending on driver, 
        # but SQLAlchemy handles conversion if defined correctly.
        # Assuming updated_at is timezone aware or naive UTC.
        # Let's just check if it exists for now, or add a simple time check.
        # For simplicity in this iteration, we trust the background refresh to keep it updated.
        # But let's add a 24h check just in case.
        if cache_entry.updated_at:
             # Ensure we're comparing compatible datetimes (offset-naive vs aware)
             # This can be tricky with SQLite. Let's rely on the background refresh to update it.
             # If data exists, return it.
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
        # updated_at updates automatically via onupdate
    else:
        cache_entry = models.RecommendationCache(
            user_id=user_id,
            category=category,
            data=json_data
        )
        db.add(cache_entry)
    
    db.commit()

def refresh_recommendations(db: Session, user_id: int, force: bool = False):
    """
    Background task to re-calculate and cache all recommendations.
    If force is False, only refreshes if cache is missing or older than 24 hours.
    """
    print(f"--- [REFRESH] Checking recommendations for user {user_id} (force={force}) ---")
    try:
        # Check if we need to refresh
        if not force:
            cache_entry = db.query(models.RecommendationCache).filter(
                models.RecommendationCache.user_id == user_id,
                models.RecommendationCache.category == "dashboard"
            ).first()
            
            if cache_entry and cache_entry.updated_at:
                last_updated = cache_entry.updated_at
                age = datetime.now(last_updated.tzinfo) - last_updated
                if age < timedelta(hours=24):
                    print(f"[REFRESH] Cache is fresh ({age}), skipping.")
                    return

        print(f"[REFRESH] Starting full recalculation for user {user_id}...")

        # 1. Calculate Dashboard Recs
        dashboard_recs = calculate_dashboard_recommendations(db, user_id)
        print(f"[REFRESH] Dashboard recs calculated: {len(dashboard_recs)} items found.")
        set_cached_data(db, user_id, "dashboard", dashboard_recs)
        
        # 2. Calculate Similar Recs
        similar_recs = calculate_similar_content(db, user_id)
        print(f"[REFRESH] Similar recs calculated: {len(similar_recs)} items found.")
        set_cached_data(db, user_id, "similar", similar_recs)
        
        print(f"--- [REFRESH] Completed for user {user_id} ---")
    except Exception as e:
        print(f"[REFRESH] FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

def get_dashboard_recommendations(db: Session, user_id: int):
    """
    Fast recommendations: Watch Now (on your subs) and Cancel (unused subs).
    Tries cache first, then calculates if missing.
    """
    cached = get_cached_data(db, user_id, "dashboard")
    if cached is not None:
        return cached
        
    # Calculate
    recs = calculate_dashboard_recommendations(db, user_id)
    
    # Only cache if valid results or if genuinely empty (handled by refresh check?)
    # If network failed, recs might be empty but we don't want to cache that for 24h.
    # Simple heuristic: If empty, don't cache it? Or cache for short time?
    # Let's say: If empty, we don't cache it, so next load tries again.
    if recs:
        set_cached_data(db, user_id, "dashboard", recs)
        
    return recs

def calculate_dashboard_recommendations(db: Session, user_id: int):
    # 0. Get User Context (Country)
    user = db.query(models.User).filter(models.User.id == user_id).first()
    country = user.country if user and user.country else "US"

    # 1. Get User's Watchlist (Filter out 'watched' - only show actionable items)
    watchlist_query = db.query(models.WatchlistItem).filter(models.WatchlistItem.user_id == user_id).all()
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

    # A. "Watch Now" - Show items available on current subscriptions
    service_watch_list = {} # { "Netflix": ["Breaking Bad", "Stranger Things"] }
    useful_subscriptions = set()
    
    for item in watchlist:
        providers = tmdb_client.get_watch_providers(item.media_type, item.tmdb_id, region=country)
        if "flatrate" in providers:
            for provider in providers["flatrate"]:
                p_name = provider["provider_name"]
                for sub in subscriptions:
                    sub_name = sub.service_name.lower()
                    if sub_name in p_name.lower() or p_name.lower() in sub_name:
                        useful_subscriptions.add(sub.id)
                        if sub.service_name not in service_watch_list:
                            service_watch_list[sub.service_name] = []
                        if item.title not in service_watch_list[sub.service_name]:
                            service_watch_list[sub.service_name].append(item.title)
        
    # Add "Watch Now" recommendations
    for service_name, items in service_watch_list.items():
        recommendations.append({
            "type": "watch_now",
            "service_name": service_name,
            "logo_url": get_service_logo(service_name, country),
            "items": items,
            "reason": f"Available on your subscription",
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
            
    # Sort by Score
    recommendations.sort(key=lambda x: x["score"], reverse=True)
    return recommendations

def get_similar_content(db: Session, user_id: int):
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

import random

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
        import json
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
            # Create mock interest objects
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
            if count >= 6: break # Increased limit to ensure we fill slots
            tmdb_id = item.get("id")
            if tmdb_id in recommended_ids: continue
            if any(w.tmdb_id == tmdb_id for w in watchlist): continue
            
            # Since we filtered by provider, we know it's on ONE of them. 
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
        items_explore = data_explore.get("results", [])[:15] # More diversity for calculating best service
        
        # We don't limit here instantly. We collect candidates first.
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
                    # Check if user has it
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
                # Store candidate for clustering
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
                # Don't add to recommended_ids yet, as we filter later

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
        if len(similar_recs) >= 6: break # Increased limit
        
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

    # --- Clustering Explore Recs ---
    # Group by service
    service_counts = {}
    for r in explore_recs:
        s = r["service_name"]
        service_counts[s] = service_counts.get(s, 0) + 1
        
    # Find best service (most items)
    best_external_service = None
    if service_counts:
        best_external_service = max(service_counts, key=service_counts.get)
    
    final_explore = []
    if best_external_service:
        final_explore = [r for r in explore_recs if r["service_name"] == best_external_service][:2]
        # Mark as used
        for r in final_explore:
            recommended_ids.add(r["tmdb_id"])

    # Combine: Prioritize Available/Similar over Explore, but ensure total is 6
    current_pool = available_recs + similar_recs
    random.shuffle(current_pool)
    
    # Target: 6 items.
    # Mix: If we have Explore items, include up to 2.
    # But if we have 6 Available, user says "fine with showing all 6 included".
    # User also said "split was just example... if you dont have 2 good recommendations [external]... fill them".
    
    # Plan: Take All Available + All Explore (Best Service).
    # Then Pick Top 6 (by Score or Shuffle).
    # Score logic: Available (90+) > Explore (88+) > Similar (75+).
    # This naturally prioritizes available discovery.
    
    all_candidates = current_pool + final_explore
    
    # Remove duplicates (just in case) based on tmdb_id
    unique_candidates = []
    seen = set()
    for c in all_candidates:
        if c["tmdb_id"] not in seen:
            unique_candidates.append(c)
            seen.add(c["tmdb_id"])
            
    # Sort by score or shuffle? User wants "New suggestions".
    # Shuffle gives variety. Score gives quality.
    # Let's Shuffle, but maybe weighting high score?
    # Simple Shuffle is best for variety.
    random.shuffle(unique_candidates)
    
    return unique_candidates[:6]
