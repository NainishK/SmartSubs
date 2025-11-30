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
    print(f"Checking recommendations for user {user_id} (force={force})...")
    try:
        # Check if we need to refresh
        if not force:
            # Check dashboard cache age
            cache_entry = db.query(models.RecommendationCache).filter(
                models.RecommendationCache.user_id == user_id,
                models.RecommendationCache.category == "dashboard"
            ).first()
            
            if cache_entry and cache_entry.updated_at:
                # Calculate age
                # Ensure timezone awareness compatibility
                last_updated = cache_entry.updated_at
                if last_updated.tzinfo is None:
                    # If naive, assume UTC or local depending on DB. 
                    # For safety, let's just use naive comparison if needed, or make both aware.
                    # Best bet: compare with datetime.utcnow() if stored as UTC, or now()
                    # Let's assume naive UTC for simplicity if DB strips it.
                    pass
                
                # Simple check: if < 24 hours old, skip
                # Note: SQLite might return string, but SQLAlchemy usually converts.
                # Let's assume it's a datetime object.
                age = datetime.now(last_updated.tzinfo) - last_updated
                if age < timedelta(hours=24):
                    print(f"Cache is fresh ({age}), skipping refresh.")
                    return

        print(f"Refreshing recommendations for user {user_id}...")

        # 1. Calculate Dashboard Recs
        dashboard_recs = calculate_dashboard_recommendations(db, user_id)
        set_cached_data(db, user_id, "dashboard", dashboard_recs)
        
        # 2. Calculate Similar Recs
        similar_recs = calculate_similar_content(db, user_id)
        set_cached_data(db, user_id, "similar", similar_recs)
        
        print(f"Recommendations refreshed for user {user_id}")
    except Exception as e:
        print(f"Error refreshing recommendations: {e}")

def get_dashboard_recommendations(db: Session, user_id: int):
    """
    Fast recommendations: Watch Now (on your subs) and Cancel (unused subs).
    Tries cache first, then calculates if missing.
    """
    cached = get_cached_data(db, user_id, "dashboard")
    if cached is not None:
        return cached
        
    # Calculate and cache
    recs = calculate_dashboard_recommendations(db, user_id)
    set_cached_data(db, user_id, "dashboard", recs)
    return recs

def calculate_dashboard_recommendations(db: Session, user_id: int):
    # 1. Get User's Watchlist
    watchlist = db.query(models.WatchlistItem).filter(models.WatchlistItem.user_id == user_id).all()
    
    # 2. Get User's Active Subscriptions
    subscriptions = db.query(models.Subscription).filter(
        models.Subscription.user_id == user_id,
        models.Subscription.is_active == True
    ).all()
    
    if not watchlist and not subscriptions:
        return []

    recommendations = []
    
    # A. "Watch Now" - Show items available on current subscriptions
    service_watch_list = {} # { "Netflix": ["Breaking Bad", "Stranger Things"] }
    useful_subscriptions = set()
    
    for item in watchlist:
        providers = tmdb_client.get_watch_providers(item.media_type, item.tmdb_id)
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

    # Calculate and cache
    recs = calculate_similar_content(db, user_id)
    set_cached_data(db, user_id, "similar", recs)
    return recs

def calculate_similar_content(db: Session, user_id: int):
    watchlist = db.query(models.WatchlistItem).filter(models.WatchlistItem.user_id == user_id).all()
    subscriptions = db.query(models.Subscription).filter(
        models.Subscription.user_id == user_id,
        models.Subscription.is_active == True
    ).all()
    
    if not watchlist or not subscriptions:
        return []

    recommendations = []
    
    # C. "Because you watched" - Suggest similar content available on current subscriptions
    # Get items marked as "watched"
    watched_items = [item for item in watchlist if item.status == "watched"]
    
    # Track recommended IDs to avoid duplicates
    recommended_ids = set()

    # For each watched item, find similar content
    for watched_item in watched_items[:3]:  # Limit to top 3 to avoid too many API calls
        similar_data = tmdb_client.get_similar(watched_item.media_type, watched_item.tmdb_id)
        similar_items = similar_data.get("results", [])[:20]  # Increased to 20 to find more candidates
        
        for similar in similar_items:
            similar_id = similar.get("id")
            
            # Skip if already recommended
            if similar_id in recommended_ids:
                continue

            # Check if already in watchlist
            already_in_watchlist = any(w.tmdb_id == similar_id for w in watchlist)
            if already_in_watchlist:
                continue
            
            # Quality Checks
            # 1. Must have a synopsis
            if not similar.get("overview"):
                continue
            
            # 2. Must have some rating (avoid unrated trash)
            if not similar.get("vote_average") or similar.get("vote_average") < 4.0:
                continue
                
            # 3. Language check: if not English, ensure it's popular enough (vote_count > 50)
            if similar.get("original_language") != "en" and similar.get("vote_count", 0) < 50:
                continue

            # Check if available on current subscriptions
            similar_providers = tmdb_client.get_watch_providers(watched_item.media_type, similar_id)
            item_added = False
            
            if "flatrate" in similar_providers:
                for provider in similar_providers["flatrate"]:
                    if item_added:
                        break
                        
                    p_name = provider["provider_name"]
                    for sub in subscriptions:
                        sub_name = sub.service_name.lower()
                        if sub_name in p_name.lower() or p_name.lower() in sub_name:
                            # Add recommendation
                            title = similar.get("title") or similar.get("name", "Unknown")
                            
                            # Infer media_type
                            media_type = similar.get("media_type") or watched_item.media_type
                            
                            recommendations.append({
                                "type": "similar_content",
                                "service_name": sub.service_name,
                                "items": [title],
                                "reason": f"Because you watched {watched_item.title}",
                                "cost": 0,
                                "savings": 0,
                                "score": 80 + (similar.get("vote_average", 0) * 2), # Boost score by rating
                                # Rich data for UI
                                "tmdb_id": similar_id,
                                "media_type": media_type,
                                "poster_path": similar.get("poster_path"),
                                "vote_average": similar.get("vote_average"),
                                "overview": similar.get("overview")
                            })
                            recommended_ids.add(similar_id)
                            item_added = True
                            break  # Break subscription loop
            
            if item_added:
                continue # Move to next similar item

    # Sort by Score
    recommendations.sort(key=lambda x: x["score"], reverse=True)

    return recommendations
ER_COSTS = {
    "Netflix": 15.49,
    "Hulu": 7.99,
    "Amazon Prime Video": 14.99,
    "Disney Plus": 7.99,
    "Max": 15.99,
    "Peacock": 4.99,
    "Apple TV Plus": 6.99,
    "Paramount Plus": 5.99
}

def get_dashboard_recommendations(db: Session, user_id: int):
    """
    Fast recommendations: Watch Now (on your subs) and Cancel (unused subs).
    """
    # 1. Get User's Watchlist
    watchlist = db.query(models.WatchlistItem).filter(models.WatchlistItem.user_id == user_id).all()
    
    # 2. Get User's Active Subscriptions
    subscriptions = db.query(models.Subscription).filter(
        models.Subscription.user_id == user_id,
        models.Subscription.is_active == True
    ).all()
    
    if not watchlist and not subscriptions:
        return []

    recommendations = []
    
    # A. "Watch Now" - Show items available on current subscriptions
    service_watch_list = {} # { "Netflix": ["Breaking Bad", "Stranger Things"] }
    useful_subscriptions = set()
    
    for item in watchlist:
        providers = tmdb_client.get_watch_providers(item.media_type, item.tmdb_id)
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
    """
    watchlist = db.query(models.WatchlistItem).filter(models.WatchlistItem.user_id == user_id).all()
    subscriptions = db.query(models.Subscription).filter(
        models.Subscription.user_id == user_id,
        models.Subscription.is_active == True
    ).all()
    
    if not watchlist or not subscriptions:
        return []

    recommendations = []
    
    # C. "Because you watched" - Suggest similar content available on current subscriptions
    # Get items marked as "watched"
    watched_items = [item for item in watchlist if item.status == "watched"]
    
    # Track recommended IDs to avoid duplicates
    recommended_ids = set()

    # For each watched item, find similar content
    for watched_item in watched_items[:3]:  # Limit to top 3 to avoid too many API calls
        similar_data = tmdb_client.get_similar(watched_item.media_type, watched_item.tmdb_id)
        similar_items = similar_data.get("results", [])[:20]  # Increased to 20 to find more candidates
        
        for similar in similar_items:
            similar_id = similar.get("id")
            
            # Skip if already recommended
            if similar_id in recommended_ids:
                continue

            # Check if already in watchlist
            already_in_watchlist = any(w.tmdb_id == similar_id for w in watchlist)
            if already_in_watchlist:
                continue
            
            # Quality Checks
            # 1. Must have a synopsis
            if not similar.get("overview"):
                continue
            
            # 2. Must have some rating (avoid unrated trash)
            if not similar.get("vote_average") or similar.get("vote_average") < 4.0:
                continue
                
            # 3. Language check: if not English, ensure it's popular enough (vote_count > 50)
            if similar.get("original_language") != "en" and similar.get("vote_count", 0) < 50:
                continue

            # Check if available on current subscriptions
            similar_providers = tmdb_client.get_watch_providers(watched_item.media_type, similar_id)
            item_added = False
            
            if "flatrate" in similar_providers:
                for provider in similar_providers["flatrate"]:
                    if item_added:
                        break
                        
                    p_name = provider["provider_name"]
                    for sub in subscriptions:
                        sub_name = sub.service_name.lower()
                        if sub_name in p_name.lower() or p_name.lower() in sub_name:
                            # Add recommendation
                            title = similar.get("title") or similar.get("name", "Unknown")
                            
                            # Infer media_type
                            media_type = similar.get("media_type") or watched_item.media_type
                            
                            recommendations.append({
                                "type": "similar_content",
                                "service_name": sub.service_name,
                                "items": [title],
                                "reason": f"Because you watched {watched_item.title}",
                                "cost": 0,
                                "savings": 0,
                                "score": 80 + (similar.get("vote_average", 0) * 2), # Boost score by rating
                                # Rich data for UI
                                "tmdb_id": similar_id,
                                "media_type": media_type,
                                "poster_path": similar.get("poster_path"),
                                "vote_average": similar.get("vote_average"),
                                "overview": similar.get("overview")
                            })
                            recommended_ids.add(similar_id)
                            item_added = True
                            break  # Break subscription loop
            
            if item_added:
                continue # Move to next similar item

    # Sort by Score
    recommendations.sort(key=lambda x: x["score"], reverse=True)

    return recommendations
