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
            "service_name": f"Watch on {service_name}",
            "reason": f"You already have this! Watch: {', '.join(items[:3])}",
            "estimated_cost": 0,
            "score": 100 + len(items) # High score to show first
        })

    # B. "Cancel Unused" - Suggest cancelling subscriptions that cover NO watchlist items
    for sub in subscriptions:
        if sub.id not in useful_subscriptions:
            recommendations.append({
                "service_name": f"Cancel {sub.service_name}?",
                "reason": "None of your watchlist items are currently on this service.",
                "estimated_cost": -sub.cost, # Negative cost implies savings
                "score": 50 + sub.cost # Higher score for more expensive unused subs
            })

    # C. "Missing Content" - Only if not covered by A
    # (Reuse the previous logic for uncovered items, but with lower priority)
    # ... [We can keep the previous logic here if desired, or simplify]
    
    # For now, let's stick to the user's request of "save money". 
    # If we really want to suggest new things, we can do it for items NOT in A.
    
    # Sort by Score
    recommendations.sort(key=lambda x: x["score"], reverse=True)

    return recommendations
