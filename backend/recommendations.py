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
