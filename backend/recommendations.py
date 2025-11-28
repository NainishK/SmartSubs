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

def get_recommendations(db: Session, user_id: int):
    """
    Analyze user's watchlist and active subscriptions to suggest new services.
    """
    # 1. Get User's Watchlist
    watchlist = db.query(models.WatchlistItem).filter(models.WatchlistItem.user_id == user_id).all()
    if not watchlist:
        return []

    # 2. Get User's Active Subscriptions
    subscriptions = db.query(models.Subscription).filter(
        models.Subscription.user_id == user_id,
        models.Subscription.is_active == True
    ).all()
    subscribed_services = {sub.service_name.lower() for sub in subscriptions}

    # 3. Aggregate Provider Counts
    service_counts = {} # { "Netflix": {"count": 0, "items": []} }

    for item in watchlist:
        # Fetch providers from TMDB
        providers = tmdb_client.get_watch_providers(item.media_type, item.tmdb_id)
        
        # Check 'flatrate' (subscription) options
        if "flatrate" in providers:
            for provider in providers["flatrate"]:
                provider_name = provider["provider_name"]
                
                if provider_name not in service_counts:
                    service_counts[provider_name] = {"count": 0, "items": []}
                
                service_counts[provider_name]["count"] += 1
                service_counts[provider_name]["items"].append(item.title)

    # 4. Generate "Save Money" & "Watch Now" Recommendations
    recommendations = []
    
    # A. "Watch Now" - Show items available on current subscriptions
    # We track which subscriptions are actually "useful" (have at least one watchlist item)
    useful_subscriptions = set()
    
    for item in watchlist:
        providers = tmdb_client.get_watch_providers(item.media_type, item.tmdb_id)
        if "flatrate" in providers:
            for provider in providers["flatrate"]:
                p_name = provider["provider_name"]
                
                # Check if this provider matches any of the user's subscriptions
                # We iterate through all subscriptions to find matches
                for sub in subscriptions:
                    sub_name = sub.service_name.lower()
                    if sub_name in p_name.lower() or p_name.lower() in sub_name:
                        useful_subscriptions.add(sub.id)
                        
                        # Create a "Watch Now" recommendation
                        # We deduplicate these later or just add them
                        # To avoid spam, we might group them, but for now let's add per item or per service
                        pass

    # Let's group "Watch Now" by service to be cleaner
    service_watch_list = {} # { "Netflix": ["Breaking Bad", "Stranger Things"] }
    
    for item in watchlist:
        providers = tmdb_client.get_watch_providers(item.media_type, item.tmdb_id)
        item_is_covered = False
        if "flatrate" in providers:
            for provider in providers["flatrate"]:
                p_name = provider["provider_name"]
                for sub in subscriptions:
                    sub_name = sub.service_name.lower()
                    if sub_name in p_name.lower() or p_name.lower() in sub_name:
                        if sub.service_name not in service_watch_list:
                            service_watch_list[sub.service_name] = []
                        if item.title not in service_watch_list[sub.service_name]:
                            service_watch_list[sub.service_name].append(item.title)
                        item_is_covered = True
        
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

    # C. "Because you watched" - Suggest similar content available on current subscriptions
    # Get items marked as "watched"
    watched_items = [item for item in watchlist if item.status == "watched"]
    
    # For each watched item, find similar content
    for watched_item in watched_items[:3]:  # Limit to top 3 to avoid too many API calls
        similar_data = tmdb_client.get_similar(watched_item.media_type, watched_item.tmdb_id)
        similar_items = similar_data.get("results", [])[:5]  # Take top 5 similar items
        
        for similar in similar_items:
            # Check if already in watchlist
            similar_id = similar.get("id")
            already_in_watchlist = any(w.tmdb_id == similar_id for w in watchlist)
            if already_in_watchlist:
                continue
            
            # Check if available on current subscriptions
            similar_providers = tmdb_client.get_watch_providers(watched_item.media_type, similar_id)
            if "flatrate" in similar_providers:
                for provider in similar_providers["flatrate"]:
                    p_name = provider["provider_name"]
                    for sub in subscriptions:
                        sub_name = sub.service_name.lower()
                        if sub_name in p_name.lower() or p_name.lower() in sub_name:
                            # Add recommendation
                            title = similar.get("title") or similar.get("name", "Unknown")
                            recommendations.append({
                                "type": "similar_content",
                                "service_name": sub.service_name,
                                "items": [title],
                                "reason": f"Because you watched {watched_item.title}",
                                "cost": 0,
                                "savings": 0,
                                "score": 80
                            })
                            break  # Only add once per similar item

    # Sort by Score
    recommendations.sort(key=lambda x: x["score"], reverse=True)

    return recommendations
