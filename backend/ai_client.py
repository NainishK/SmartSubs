import google.generativeai as genai
from config import settings
import json
import tmdb_client 
# Note: Using absolute import if needed, assuming same directory
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Configure Gemini
if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "YOUR_GEMINI_API_KEY_HERE":
    genai.configure(api_key=settings.GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY not set. AI features will be disabled.")

def generate_ai_recommendations(user_history: list, user_ratings: list, active_subs: list, country: str = "US"):
    """
    Generates tailored movie/show recommendations using Gemini 1.5 Flash.
    
    Args:
        user_history: List of dicts [{"title": "Breaking Bad", "status": "watched"}, ...]
        user_ratings: List of dicts [{"title": "The Bear", "rating": 5}, ...]
        active_subs: List of strings ["Netflix", "Hulu"]
        country: User's country code (e.g., "US", "IN") for regional availability.
        
    Returns:
        List of 5 recommendations (dict with title, reason, service).
    """
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
        return []

    try:
        # Dynamic Model Selection
        model_name = "gemini-pro" # Default fallback
        try:
            available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
            logger.info(f"Available models: {available_models}")
            
            # Priority list
            for candidate in [
                "models/gemini-2.5-flash", 
                "models/gemini-2.0-flash", 
                "models/gemini-1.5-flash",
                "models/gemini-flash-latest",
                "models/gemini-pro-latest"
            ]:
                if candidate in available_models:
                    model_name = candidate
                    break
        except Exception as e:
            logger.warning(f"Failed to list models, falling back to default {model_name}: {e}")

        logger.info(f"Using model: {model_name}")
        model = genai.GenerativeModel(model_name)
        
        # Construct Context
        history_text = "\n".join([f"- {h['title']} ({h['status']})" for h in user_history[-20:]]) # Last 20 items
        ratings_text = "\n".join([f"- {r['title']}: {r['rating']}/5 Stars" for r in user_ratings])
        subs_text = ", ".join(active_subs)
        
        prompt = f"""
        Act as an elite movie critic and personal curator based in {country}. 
        Analyze the user's taste based on their history and ratings, but ONLY recommend titles 
        that are currently available in the {country} region.

        User's Watch History:
        {history_text}
        
        User's Ratings:
        {ratings_text}
        
        User's Active Subscriptions: {subs_text}
        User's Region: {country}
        
        Task:
        Recommend 8 "Hidden Gems" or "Perfect Matches" available in {country} that are distinct from what they have watched.
        Prioritize movies/shows available on their active subscriptions in {country} (User's Subs: {subs_text}).
        If a show is not on their subs but is a PERFECT match and available in {country}, you can include it but mention the service.
        
        Output strictly in JSON format:
        [
            {{
                "title": "Movie Title",
                "reason": "A short, 1-sentence punchy explanation of why it fits their vibe (e.g. 'Since you loved X, this dark comedy is a must-watch').",
                "service": "Netflix/Hulu/etc"
            }},
            ...
        ]
        """
        
        response = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
        
        # Parse JSON
        # Parse JSON
        text_recs = []
        try:
            text_recs = json.loads(response.text)
        except json.JSONDecodeError:
            # Cleanup markdown if raw load fails
            raw_text = response.text.replace('```json', '').replace('```', '')
            try:
                text_recs = json.loads(raw_text)
            except:
                logger.error("Failed to parse AI response")
                return []
        
        # Enrichment Loop
        enriched_recs = []
        for rec in text_recs:
            if not isinstance(rec, dict): continue
            
            enrichment = {}
            # Search TMDB for metadata
            try:
                search_results = tmdb_client.search_multi(rec['title'])
                if search_results.get('results'):
                    best_match = search_results['results'][0]
                    enrichment = {
                        "tmdb_id": best_match.get('id'),
                        "media_type": best_match.get('media_type', 'movie'),
                        "poster_path": best_match.get('poster_path'),
                        "vote_average": best_match.get('vote_average'),
                        "overview": best_match.get('overview')
                    }
                    logger.info(f"Enriched '{rec['title']}' -> ID: {enrichment['tmdb_id']}")
                else:
                    logger.warning(f"Could not find TMDB match for: {rec['title']}")
            except Exception as e:
                logger.error(f"Error enriching {rec['title']}: {e}")
                
            enriched_recs.append({**rec, **enrichment})

        return enriched_recs

    except Exception as e:
        logger.error(f"AI Generation Failed: {e}")
        return []

def explain_recommendation(title: str, user_history_summary: str):
    """
    Optional: Get a deeper explanation for a specific title.
    """
    pass
