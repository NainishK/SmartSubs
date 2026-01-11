import requests
from config import settings
import json
import re
import tmdb_client 
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Direct REST implementation to bypass SDK versioning issues

def _call_gemini_rest(prompt: str, model_name: str = "gemini-flash-latest"):
    if not settings.GEMINI_API_KEY:
        return None
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={settings.GEMINI_API_KEY}"
    headers = {'Content-Type': 'application/json'}
    data = {
        "contents": [{"parts": [{"text": prompt}]}]
        # "generationConfig": {"response_mime_type": "application/json"} # Removed for compatibility
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 429:
            # Raise exception so main.py can trigger Quota UI
            logger.error(f"Gemini Quota Exceeded (429): {response.text}")
            raise Exception("Gemini 429: Resource Exhausted")
        else:
            logger.error(f"Gemini REST Error {response.status_code}: {response.text}")
            return None
    except Exception as e:
        # Re-raise 429 exceptions
        if "429" in str(e):
             raise e
        logger.error(f"Gemini REST Request Failed: {e}")
        return None

def generate_ai_recommendations(user_history: list, user_ratings: list, active_subs: list, country: str = "US"):
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
        return []

    # Construct Context
    history_text = "\n".join([f"- {h['title']} ({h['status']})" for h in user_history[-20:]]) 
    ratings_text = "\n".join([f"- {r['title']}: {r['rating']}/10 Stars" for r in user_ratings])
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
    
    IMPORTANT RULES:
    1. Use CANONICAL TITLES only (e.g. "Severance", NOT "Severance Season 2").
    2. Ratings mentioned in "reason" must be on a 10-star scale (e.g. 9/10, not 4.5/5).
    3. Prioritize movies/shows available on their active subscriptions in {country} (User's Subs: {subs_text}).
    4. If a show is not on their subs but is a PERFECT match and available in {country}, you can include it but mention the service.
    5. REGIONAL CONTEXT (India): "JioCinema" and "Disney+ Hotstar" are merging into "JioHotstar". Treat them as a consolidated entity where applicable. Do not suggest adding one if they have the other, unless for specific content exclusivity.
    
    Output strictly in JSON format containing a list of objects with keys: title, reason, service.
    """
    
    data = _call_gemini_rest(prompt)
    if not data: return []
    
    text_recs = []
    try:
        # Extract text from Gemini response structure
        raw_text = data['candidates'][0]['content']['parts'][0]['text']

        text_recs = json.loads(raw_text)
    except Exception as e:
        logger.error(f"Failed to parse REST response: {e}")
        return []

    # Enrichment Loop
    enriched_recs = []
    for rec in text_recs:
        if not isinstance(rec, dict): continue
        enrichment = {}
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
        except: pass
        enriched_recs.append({**rec, **enrichment})

    # Validated Enrichment: Only keep items that successfully found a match and poster
    validated_recs = [
        r for r in enriched_recs 
        if r.get("tmdb_id") and r.get("poster_path")
    ]

    return validated_recs


def generate_unified_insights(user_history: list, user_ratings: list, active_subs: list, preferences: dict, country: str = "US", currency: str = "USD"):
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
        return None

    from datetime import datetime
    current_date = datetime.now().strftime("%B %Y")

    # Context
    history_text = "\n".join([f"- {h['title']} ({h['status']})" for h in user_history[-20:]])
    ratings_text = "\n".join([f"- {r['title']}: {r['rating']}/10" for r in user_ratings])
    subs_text = ", ".join(active_subs)
    pref_text = json.dumps(preferences, indent=2)
    
    prompt = f"""
    Act as an elite streaming consultant and financial optimizer for a user in {country}.
    Current Date: {current_date} (Use this to filter out already released content when suggesting "Upcoming" items).
    User Currency: {currency}
    
    User Profile:
    - Active Subscriptions: {subs_text}
    - Watch History:
    {history_text}
    - Ratings:
    {ratings_text}
    - Preferences:
    {pref_text}
    
    Task: Provide a 3-part comprehensive report in STRICT JSON format:
    1. "picks": 12 Hidden Gems/Matches. Priority to active subs. (We will filter best 6).
    2. "strategy": 1-3 Financial Actions (Cancel/Add). ALL monetary values must be in {currency}.
    3. "gaps": 8 specific titles they are missing out on. (We will filter best 4).
    
    Output JSON Structure:
    {{
        "picks": [ {{ "title": "...", "reason": "...", "service": "..." }} ],
        "strategy": [ {{ "action": "Cancel" or "Add", "service": "...", "reason": "...", "savings": 10.0 }} ],
        "gaps": [ {{ "title": "...", "service": "...", "reason": "..." }} ]
    }}
    """
    
    response_data = _call_gemini_rest(prompt)
    if not response_data: return None
    
    data = {}
    try:
        raw_text = response_data['candidates'][0]['content']['parts'][0]['text']

        logger.info(f"AI Response Raw: {raw_text}")
        
        try:
            data = json.loads(raw_text)
        except:
            cleaned = raw_text.replace('```json', '').replace('```', '')
            data = json.loads(cleaned)
            
    except Exception as e:
        logger.error(f"Unified Parsing Failed: {e}")
        return None
        
    # Enrich Picks and Filter Bad Ones
    if "picks" in data:
        valid_picks = []
        seen_ids = set()
        for rec in data["picks"]:
            _enrich_item(rec)
            tmdb_id = rec.get("tmdb_id")
            if tmdb_id and rec.get("poster_path"):
                if tmdb_id not in seen_ids:
                    valid_picks.append(rec)
                    seen_ids.add(tmdb_id)
        data["picks"] = valid_picks[:6]
            
    # Enrich Gaps and Filter Bad Ones
    if "gaps" in data:
        valid_gaps = []
        seen_ids = set()
        for gap in data["gaps"]:
            _enrich_item(gap)
            tmdb_id = gap.get("tmdb_id")
            if tmdb_id and gap.get("poster_path"):
                 if tmdb_id not in seen_ids:
                    valid_gaps.append(gap)
                    seen_ids.add(tmdb_id)
        data["gaps"] = valid_gaps[:3]
            
    return data

def _enrich_item(item):
    """Helper to add TMDB data to an item dict"""
    try:
        # Clean title for better matching (remove Season suffix)
        clean_title = re.sub(r':\s*Season\s+\d+|\s+Season\s+\d+', '', item['title'], flags=re.IGNORECASE).strip()
        
        # Primary Search
        results = tmdb_client.search_multi(clean_title)
        
        # Fallback: If no results and title has special chars, try simplifying further
        if not results.get('results') and ':' in clean_title:
             simple_title = clean_title.split(':')[0].strip()
             results = tmdb_client.search_multi(simple_title)

        if results.get('results'):
            best = results['results'][0]
            item['tmdb_id'] = best.get('id')
            item['media_type'] = best.get('media_type', 'movie') # Default to movie if unspecified, but API usually sends it
            item['poster_path'] = best.get('poster_path')
            item['vote_average'] = best.get('vote_average')
            item['overview'] = best.get('overview')
            
            # Correction: if we searched for a show but got movie default, trust TMDB
            # If nothing found, try to infer from title (e.g. if "Season" was present originally)
            
        elif "Season" in item['title']:
             item['media_type'] = 'tv' # Fallback for TV shows if TMDB fails
             
    except Exception as e:
        logger.error(f"Enrichment Failed for {item.get('title')}: {e}")
        print(f"DEBUG: Enrichment Failed for {item.get('title')}: {e}")

def explain_recommendation(title: str, user_history_summary: str):
    pass
