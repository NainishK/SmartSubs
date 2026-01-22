import requests
from config import settings
import json
import re
import tmdb_client 
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Direct REST implementation to bypass SDK versioning issues and support fallback
def _call_gemini_rest(prompt: str, model_name: str = "gemini-1.5-flash"):
    if not settings.GEMINI_API_KEY:
        return None
        
    # Fallback Chain: Use validated models from user's environment (2.0/2.5)
    candidates = [
        "gemini-2.5-flash",       # Primary: Matches User's Quota (5/20 used)
        "gemini-2.0-flash",       # Secondary
        "gemini-2.0-flash-lite",  # Tertiary
        "gemini-flash-latest",    # Backup
        "gemini-pro-latest"       # Last Resort
    ]
    
    # Remove duplicates while preserving order
    seen = set()
    unique_candidates = []
    for m in candidates:
        if m not in seen:
            unique_candidates.append(m)
            seen.add(m)
            
    last_error = None
    
    for model in unique_candidates:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.GEMINI_API_KEY}"
        headers = {'Content-Type': 'application/json'}
        data = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        
        try:
            logger.info(f"Attempting AI Generation with model: {model}...")
            # Add Timeout to prevent infinite hangs (Increased to 60s for 2.x models)
            response = requests.post(url, headers=headers, json=data, timeout=60)
            
            if response.status_code == 200:
                logger.info(f"Success with model: {model}")
                return response.json()
            elif response.status_code == 429:
                logger.warning(f"Quota Exceeded (429) on {model}. Trying next...")
                last_error = f"429 Quota Exceeded on {model}"
            elif response.status_code == 404:
                logger.warning(f"Model Not Found (404): {model}. Trying next...")
                last_error = f"404 Not Found: {model}"
            else:
                logger.error(f"Error {response.status_code} on {model}: {response.text}")
                last_error = f"Error {response.status_code}: {response.text}"
                
        except requests.exceptions.Timeout:
            logger.warning(f"Timeout (60s) on {model}. Trying next...")
            last_error = f"Timeout on {model}"
            
        except Exception as e:
            logger.error(f"Request Failed on {model}: {e}")
            last_error = str(e)
            
    # If all fail, raise exception to trigger frontend error handling
    if last_error:
        # If it was a quota issue effectively (all models exhausted)
        if "429" in str(last_error) or "Quota" in str(last_error):
             raise Exception("Gemini 429: Resource Exhausted (All Models)")
        raise Exception(f"AI Generation Failed (All Models used). Last Error: {last_error}")
        
    return None




def generate_unified_insights(user_history: list, user_ratings: list, active_subs: list, preferences: dict, dropped_history: list = [], deal_breakers: list = [], ignored_titles: list = [], ignored_ids: set = set(), watchlist_ids: set = set(), country: str = "US", currency: str = "USD"):
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
        return None

    from datetime import datetime
    current_date = datetime.now().strftime("%B %Y")

    # Context
    history_text = "\n".join([f"- {h['title']} ({h['status']})" for h in user_history[-20:]])
    ratings_text = "\n".join([f"- {r['title']}: {r['rating']}/10" for r in user_ratings])
    # Parse active_subs (Handle both string list and rich object list)
    if active_subs and isinstance(active_subs[0], dict):
        subs_text = ", ".join([f"{s['name']} ({s.get('cost')} {s.get('currency')}/{s.get('billing')})" for s in active_subs])
    else:
        subs_text = ", ".join(active_subs)
    pref_text = json.dumps(preferences, indent=2)
    dropped_text = "\n".join([f"- {d['title']}" for d in dropped_history])
    deal_breakers_text = ", ".join(deal_breakers)
    ignored_text = ", ".join(ignored_titles)
    deal_breakers_text = ", ".join(deal_breakers)
    
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
    - Preferences:
    {pref_text}
    - Dropped/Disliked Content:
    {dropped_text}
    - Explicit Deal Breakers (BANNED Topics/Genres): {deal_breakers_text}
    - Repetitive/Ignored Content (Avoid these, user has skipped them multiple times): {ignored_text}
    
    Task: Provide a 3-part comprehensive report in STRICT JSON format:
    1. "picks": 20 Hidden Gems/Matches. Priority to active subs. (We will filter best 6).
    2. "strategy": 1-3 Financial Actions (Cancel/Add). ALL monetary values must be in {currency}.
    3. "gaps": 8 specific titles they are missing out on. (We will filter best 4).
    
    IMPORTANT RULES:
    1. Use CANONICAL TITLES only (e.g. "Severance", NOT "Severance Season 2").
    2. Ratings mentioned in "reason" must be on a 10-star scale.
    3. REGIONAL CONTEXT (India): "JioCinema" and "Disney+ Hotstar" are merging into "JioHotstar". Treat them as a consolidated entity.
    4. NO DUPLICATES: Do NOT recommend any title that is already listed in "User's Watch History" (even if status is 'plan_to_watch'). The user wants NEW discoveries, not reminders.
    5. STRATEGY CONSISTENCY: Do not provide conflicting advice for the same service (e.g. do NOT suggest Cancelling AND Upgrading/Keeping the same service). Cancellation advice overrides optimization.
    6. FORMATTING: Output "reason" as a single clean paragraph. Do NOT include trailing numbers, bullet points, or list indexes inside the text fields.
    
    IMPORTANT ON NEGATIVE FILTERING:
    - Analyzie "Dropped/Disliked" content to understand specific dislikes (e.g. "Too slow", "Bad acting"). 
    - DO NOT ban entire genres just because of one dropped show (e.g. Dropping "Big Bang Theory" does NOT mean they hate all Sitcoms, unless "Sitcoms" is listed in "Deal Breakers").
    - ONLY strictly exclude content if it falls under "Explicit Deal Breakers".
    
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
        
    def _clean_text(txt):
        if not txt: return ""
        # Remove trailing single digits, zeros, or "0.0" on new lines or at end of strings
        # Case 1: Newline followed by digit(s)
        txt = re.sub(r'[\r\n]+\s*\d+(\.0)?\s*$', '', txt)
        # Case 2: Space followed by digit(s) at very end (e.g. "text 0")
        txt = re.sub(r'\s+\d+(\.0)?\s*$', '', txt)
        return txt.strip()

    if "strategy" in data:
        for s in data["strategy"]:
            s["reason"] = _clean_text(s.get("reason", ""))
            
    if "picks" in data:
        for p in data["picks"]:
            p["reason"] = _clean_text(p.get("reason", ""))

    if "gaps" in data:
        for g in data["gaps"]:
            g["reason"] = _clean_text(g.get("reason", ""))

    # Enrich Picks and Filter Bad Ones
    if "picks" in data:
        # First, enrich all picks
        enriched_recs = []
        for rec in data["picks"]:
            _enrich_item(rec)
            enriched_recs.append(rec)

        # Validated Enrichment: Only keep items that successfully found a match and poster
        # AND are not already in the user's watchlist (Hard Filter)
        validated_recs = []
        seen_ids = set() # To prevent duplicates within the picks list itself
        
        for r in enriched_recs:
            # Check 1: Must have ID and Poster
            if not r.get("tmdb_id") or not r.get("poster_path"):
                 continue
                 
            # Check 2: Must NOT be in Watchlist (Plan to Watch, Watching, etc.)
            if r.get("tmdb_id") in watchlist_ids:
                 logger.info(f"Skipping Duplicate Recommendation: {r.get('title')} (ID: {r.get('tmdb_id')}) because it's in watchlist.")
                 continue
            
            # Check 3: Check for Hard Banned (Ignored) items
            if str(r.get("tmdb_id")) in ignored_ids:
                 logger.info(f"Skipping Ignored Item (Hard Filter): {r.get('title')} (ID: {r.get('tmdb_id')}).")
                 continue

            # Check 4: Must not be a duplicate within the current list of picks
            if r.get("tmdb_id") in seen_ids:
                logger.info(f"Skipping Duplicate Recommendation: {r.get('title')} (ID: {r.get('tmdb_id')}) because it's already picked.")
                continue

            validated_recs.append(r)
            seen_ids.add(r.get("tmdb_id"))
            
        data["picks"] = validated_recs[:6]
            
    # Enrich Gaps and Filter Bad Ones
    if "gaps" in data:
        valid_gaps = []
        seen_ids = set()
        for gap in data["gaps"]:
            _enrich_item(gap)
            tmdb_id = gap.get("tmdb_id")
            if tmdb_id and gap.get("poster_path"):
                 # Filter Out Watchlist/Ignored items for GAPS too
                 if tmdb_id in watchlist_ids:
                     logger.info(f"Skipping Gap Item {gap.get('title')} (ID: {tmdb_id}) - Already in Watchlist")
                     continue
                 if str(tmdb_id) in ignored_ids:
                      logger.info(f"Skipping Gap Item {gap.get('title')} (ID: {tmdb_id}) - Ignored")
                      continue

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

            # Quality Check: If rating or overview is missing/incomplete, try fetching full details
            if not item['vote_average'] or not item['overview']:
                try:
                    full_details = tmdb_client.get_details(item['media_type'], item['tmdb_id'])
                    if full_details:
                         if full_details.get('vote_average'):
                             item['vote_average'] = full_details.get('vote_average')
                         if full_details.get('overview'):
                             item['overview'] = full_details.get('overview')
                         logger.info(f"Enriched {clean_title} via get_details logic. Rating: {item['vote_average']}")
                except Exception as e:
                    logger.warning(f"Failed to fetch full details for enrichment fallback: {e}")
            
            # Correction: if we searched for a show but got movie default, trust TMDB
            # If nothing found, try to infer from title (e.g. if "Season" was present originally)
            
        elif "Season" in item['title']:
             item['media_type'] = 'tv' # Fallback for TV shows if TMDB fails
             
    except Exception as e:
        logger.error(f"Enrichment Failed for {item.get('title')}: {e}")
        print(f"DEBUG: Enrichment Failed for {item.get('title')}: {e}")

def explain_recommendation(title: str, user_history_summary: str):
    pass
