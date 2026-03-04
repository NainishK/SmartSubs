# Backend Modules — Deep Dive

A detailed, function-by-function explanation of every backend module in SmartSubs.

---

## Table of Contents

1. [main.py — API Endpoints & App Setup](#mainpy)
2. [crud.py — Database Operations](#crudpy)
3. [recommendations.py — Recommendation Engine](#recommendationspy)
4. [ai_client.py — Gemini AI Integration](#ai_clientpy)
5. [tmdb_client.py — TMDB API Wrapper](#tmdb_clientpy)
6. [Other Modules](#other-modules)

---

## main.py

**What it does:** This is the heart of the backend. It defines the FastAPI app, all API endpoints, middleware, and the admin panel.

**Lines:** ~1040 | **Endpoints:** ~30

### App Initialization (Lines 1–131)

```python
# Lines 1-16: Import all dependencies and create the FastAPI app
models.Base.metadata.create_all(bind=engine)  # Auto-creates all DB tables on startup
app = FastAPI()
```

**Middleware stack (order matters!):**
1. **Logging Middleware** (L23-44) — Logs every request: `METHOD /path - STATUS - TIMEms - IP`. Errors (500+) go to `logger.error`, warnings (400+) to `logger.warning`.
2. **Session Middleware** (L115) — Required for Google OAuth (stores OAuth state in cookies).
3. **CORS Middleware** (L117-123) — Allows all origins (`*`). Required for frontend-backend communication.

**Admin Panel** (L46-95):
Uses `sqladmin` library. Accessible at `/admin` with hardcoded credentials (`admin`/`admin123`). Lets you view/edit Users, Subscriptions, and Watchlist items directly in a web UI.

### How Auth Works

```
User Login Flow:
1. POST /token { username: "email", password: "pass" }
2. Server verifies password via bcrypt hash comparison
3. Server creates JWT token with user's email embedded
4. Returns { access_token: "eyJ...", token_type: "bearer" }
5. Frontend stores token in localStorage
6. Every subsequent request includes: Authorization: Bearer <token>
7. dependencies.get_current_user() decodes the token → finds User in DB
```

### AI Access Control (Lines 133-178)

`validate_ai_access()` enforces a quota system:
- **Admin approves** each user individually via the admin panel (`ai_allowed = True`)
- **Quota policies:** `unlimited`, `daily`, `weekly`
- **Reset logic:** If `daily`, resets count at midnight. If `weekly`, resets after 7 days.
- **Rate limiting:** If `ai_usage_count >= ai_request_limit`, returns HTTP 429.

### Profile Update — Country Switch Logic (Lines 229-298)

When a user changes their country (e.g., US → IN), the system:
1. **Saves a snapshot** of all current preferences to `regional_profiles[old_country]`
2. **Checks if new country has saved prefs** → restores them if yes
3. **Clean slate if new** → clears all preference fields (budget, languages, etc.)
4. **Triggers recommendation refresh** — because different countries have different streaming services

This ensures when a user switches back to their old country, all preferences (budget, watch time, languages) are restored.

### Subscription Endpoints (Lines 402-464)

Simple CRUD with two important behaviors:
- **Auto-assigns country** from user's profile if not provided
- **Attaches service logo** from the `services` table (tries user's country first, falls back to US)
- **Triggers recommendation refresh** after every add/delete/update (because subscriptions affect "Watch Now" and "Cancel" recs)

### Watchlist Availability Check (Lines 487-591)

`POST /watchlist/availability` is the most complex endpoint. Here's what it does:

```
1. Get user's active OTT subscriptions
2. Build a provider ID map (Netflix=8, Hulu=15, etc.)
3. For EACH watchlist item (in parallel, 10 threads):
   a. Call TMDB watch providers API
   b. Check if any provider matches user's subscriptions
   c. Match by provider ID first, then by name (fuzzy)
4. Batch-update the database with availability badges
5. Return a map: { tmdb_id: "Netflix", tmdb_id2: "Hulu", ... }
```

The frontend uses this to show "Available on Netflix" badges on watchlist cards.

### Recommendation Endpoints (Lines 652-673)

Three endpoints, all thin wrappers around `recommendations.py`:
- `GET /recommendations/dashboard` — Fast recs (Watch Now, Cancel, Subscribe, Trending, Explore)
- `GET /recommendations/similar` — Slow recs (You Might Like, Curator Picks, Missing Out)
- `POST /recommendations/refresh` — Force-refresh the cache (used after data changes)

### AI Insights Endpoint (Lines 680-897)

`POST /recommendations/insights` — The biggest single endpoint (~220 lines). Here's the flow:

```
1. Validate AI access (quota check)
2. Check cache (insights cached for 24 hours)
3. If not cached or force_refresh:
   a. Build user context:
      - Watch history (title, rating, status)
      - Active subscriptions (name, cost)
      - User preferences (budget, languages, deal-breakers)
      - Dropped items (watched then removed)
   b. Call ai_client.generate_unified_insights(...)
   c. Receives: { picks: [...], strategy: [...], gaps: [...] }
   d. Enrich each pick/gap with TMDB data (poster, rating, overview)
   e. Cache the result
   f. Update AI usage count
4. Return AIUnifiedResponse
```

### Bug Report Endpoint (Lines 927-1035)

`POST /feedback/report` — Creates GitHub Issues:
1. Maps category to GitHub label (`bug` → `bug`, `feature` → `enhancement`, `other` → `feedback`)
2. If screenshots provided (up to 3):
   - Uploads each to `.feedback/` folder in the GitHub repo via Contents API
   - Gets the raw download URL for each uploaded image
3. Builds issue body with description + embedded screenshot URLs
4. Creates the issue via `POST /repos/{owner}/{repo}/issues`

---

## crud.py

**What it does:** All direct database read/write operations. Every endpoint in `main.py` calls functions here.

**Lines:** 314 | **Functions:** 24

### User Functions

| Function | What It Does |
|----------|-------------|
| `get_user(db, user_id)` | Simple lookup by ID |
| `get_user_by_email(db, email)` | Lookup by email (used in login) |
| `create_user(db, user)` | Hash password → create User row |
| `update_user_profile(db, user_id, country)` | Update country field |
| `update_user_preferences(db, user_id, preferences)` | Save preferences JSON string |
| `update_user_password(db, user_id, new_password)` | Rehash + save new password |
| `update_user_ai_usage(db, user_id)` | Increment AI usage counter + timestamp |

### Subscription Functions

| Function | What It Does |
|----------|-------------|
| `get_user_subscriptions(db, user_id, country)` | Get subs filtered by country |
| `create_user_subscription(db, subscription, user_id)` | Create sub + auto-set next billing date based on cycle |
| `delete_subscription(db, subscription_id, user_id)` | Delete (with ownership check) |
| `update_subscription(db, subscription_id, subscription, user_id)` | Partial update (only non-null fields) |

### Watchlist Functions

#### `create_watchlist_item()` (Lines 89-182) — Most Complex

This is 90+ lines because it does a LOT:

```python
def create_watchlist_item(db, item, user_id):
    # 1. Check for duplicates (same tmdb_id + user)
    # 2. Fetch full TMDB details (genres, language, poster, vote_average)
    # 3. Determine media type (movie or tv)
    # 4. For TV shows: fetch season/episode counts
    # 5. Determine poster path (from request or TMDB)
    # 6. Get genre IDs (from request or TMDB details)
    # 7. Get original_language (from request or TMDB)
    # 8. Create WatchlistItem row with all enriched data
    # 9. Update UserInterest scores (+1 for each genre)
    # 10. Return the created item
```

Why so complex? Because the frontend might send minimal data (just `tmdb_id` and `title`), so the backend enriches it with full TMDB metadata to ensure consistent data.

#### `update_watchlist_item_rating()` (Lines 199-235)

Updates the rating AND adjusts genre interest scores:
```python
# Old rating impact is reversed, new rating impact is applied
# Rating 8-10: +3 score (loved it)
# Rating 5-7:  +1 score (liked it)  
# Rating 3-4:  -1 score (meh)
# Rating 1-2:  -3 score (hated it)
```

This powers the recommendation engine — genres you rate highly get boosted.

### `update_interests()` (Lines 69-87)

Adjusts genre interest scores. Called when items are added/rated/removed.

```python
# For each genre_id in the item:
#   Find or create a UserInterest row
#   Add delta to score (positive for add, negative for remove)
#   Score can go below 0 (actively disliked genres)
```

---

## recommendations.py

**What it does:** The core recommendation engine. Generates personalized content suggestions using TMDB data + user's watchlist/subscriptions/interests.

**Lines:** 712 | **Functions:** 10

### Caching System (Lines 21-62)

```python
get_cached_data(db, user_id, category)
# Checks RecommendationCache table
# Cache key = `{category}_{user_country}` (region-specific)
# Returns data if < 24 hours old, else None

set_cached_data(db, user_id, category, data)
# Saves JSON-serialized data to cache
# Upserts (updates if exists, inserts if new)

clear_user_cache(db, user_id)
# Deletes ALL cache rows for a user (used on major data changes)
```

### `refresh_recommendations()` (Lines 64-120)

Background task that recalculates recommendations:
```python
def refresh_recommendations(db, user_id, force=False, category=None):
    # If not force: only refresh if cache is missing or > 24 hours old
    # If force: always recalculate
    # category=None: refresh both "dashboard" and "similar"
    # category="dashboard": only refresh dashboard recs
    # category="similar": only refresh similar content recs
```

### `calculate_dashboard_recommendations()` (Lines 142-375)

The main recommendation algorithm. Generates 5 types of recommendations:

#### 1. Watch Now (Lines ~170-250)
```
For each Plan to Watch item in user's watchlist:
  → Call TMDB get_watch_providers()
  → Check if any provider matches user's active subscriptions
  → If yes → add to "Watch Now" list with service name + logo
```

#### 2. Cancel Suggestions (Lines ~250-280)
```
For each active subscription:
  → Count how many watchlist items are available on it
  → If 0 items available → suggest cancellation
  → Calculate potential savings (monthly cost)
```

#### 3. Subscribe Suggestions (Lines ~280-310)
```
For each watchlist item NOT available on user's subs:
  → Check what services carry it
  → Count how many items each service covers
  → Suggest services that unlock the most watchlist items
```

#### 4. Trending Content (Lines ~310-340)
```
For each of user's top 3 genre interests:
  → Call TMDB discover_media() sorted by popularity
  → Filter out items already in watchlist
  → Take top 3 per genre
  → Result: 9 trending items personalized to user's taste
```

#### 5. Explore / Discovery (Lines ~340-375)
```
Similar to trending but uses different genres (random from interests)
Provides variety beyond the top genres
```

### `calculate_similar_content()` (Lines 398-711)

Generates 3 types of deeper recommendations:

#### 1. You Might Like (Lines ~410-520)
```
For each highly-rated item (rating >= 7) in user's watchlist:
  → Call TMDB get_similar()
  → Filter out items already in watchlist
  → Score each by genre overlap with user interests
  → Take top results
```

#### 2. Curator Picks (Lines ~520-600)
```
Based on user's top genre interests:
  → TMDB discover with high vote_average (>7.5)
  → Filtered to user's active streaming services
  → "Hidden gems on services you already have"
```

#### 3. Missing Out (Lines ~600-711)
```
Content available on user's active subscriptions:
  → TMDB discover filtered to user's provider IDs
  → Sorted by popularity/rating
  → "You're paying for Netflix — here's what you're missing"
```

---

## ai_client.py

**What it does:** Calls Google Gemini AI to generate personalized insights.

**Lines:** 294 | **Functions:** 4

### `_call_gemini_rest()` (Lines 12-75)

Low-level function that makes HTTP calls to the Gemini REST API:
```python
def _call_gemini_rest(prompt, model_name="gemini-1.5-flash"):
    # Tries primary model first
    # Falls back to alternate model IDs if first fails
    # Model priority: gemini-1.5-flash → gemini-2.0-flash → gemini-pro
    # Parses JSON from response (handles markdown code blocks in response)
    # Returns parsed dict or None
```

Why REST instead of the official SDK? The Gemini Python SDK had version compatibility issues, so this bypasses it entirely.

### `generate_unified_insights()` (Lines 80-245)

The main AI function. Builds a detailed prompt and parses the structured response:

```python
def generate_unified_insights(user_history, user_ratings, active_subs, 
                                preferences, dropped_history, deal_breakers,
                                ignored_titles, ignored_ids, watchlist_ids,
                                country, currency):
    # 1. Build a structured prompt with all user context:
    #    - "You are an entertainment advisor..."
    #    - User's watched titles + ratings
    #    - Active subscriptions + costs
    #    - Preferences (budget, languages, household size)
    #    - Items they dropped (negative signal)
    #    - Deal breakers (e.g., "no ads")
    #    
    # 2. Ask Gemini to return JSON with 3 sections:
    #    picks: [{title, reason, service}]    — What to watch next
    #    strategy: [{action, service, reason}] — Keep/cancel/add services
    #    gaps: [{title, service, reason}]      — Content gaps
    #    
    # 3. Parse JSON response (handles various edge cases)
    # 4. Clean up text (strip markdown formatting)
    # 5. Return structured dict
```

### `_enrich_item()` (Lines 247-290)

After AI returns titles, this function adds real TMDB data:
```python
def _enrich_item(item):
    # Takes {"title": "Inception", "service": "Netflix"}
    # Searches TMDB → finds tmdb_id, poster_path, vote_average, overview
    # Returns enriched item with all visual data
```

This is critical because Gemini might hallucinate — TMDB validation confirms the title exists and provides correct metadata.

---

## tmdb_client.py

**What it does:** Wraps all TMDB (The Movie Database) API calls with retry logic and caching.

**Lines:** 165 | **Functions:** 5

### Global Session Setup (Lines 1-14)
```python
# Uses requests.Session with automatic retry (3 attempts, exponential backoff)
# Retries on 500/502/503/504 errors
# SSL verification disabled (verify=False) due to some deployment environments
```

### Functions

| Function | TMDB Endpoint | Caching | Purpose |
|----------|--------------|---------|---------|
| `search_multi(query)` | `/search/multi` | None | Search movies + TV by name |
| `get_watch_providers(type, id, region)` | `/{type}/{id}/watch/providers` | `@lru_cache(128)` | Which services stream this title |
| `get_similar(type, id)` | `/{type}/{id}/similar` | None | Similar movies/TV shows |
| `get_details(type, id)` | `/{type}/{id}` | None | Full metadata (genres, runtime, etc.) |
| `discover_media(type, ...)` | `/discover/{type}` | None | Browse by genre, popularity, provider |

**Important:** `get_watch_providers` is the ONLY cached function (in-memory LRU cache of 128 entries). This is because provider data rarely changes and it's called hundreds of times during recommendation calculation.

---

## Other Modules

### config.py
Pydantic `BaseSettings` class that reads from `.env`:
- `DATABASE_URL`, `SECRET_KEY`, `TMDB_API_KEY`, `GEMINI_API_KEY`
- OAuth settings, email settings, GitHub PAT
- Auto-strips trailing slash from `FRONTEND_URL`

### database.py
SQLAlchemy setup:
- Creates `engine` from `DATABASE_URL`
- Handles PostgreSQL (Neon) vs SQLite connection
- `SessionLocal` factory for creating DB sessions

### dependencies.py
Single function: `get_current_user(token)`
- Decodes JWT token → extracts email
- Looks up user in DB
- Raises 401 if token invalid or user not found
- Used as `Depends(get_current_user)` on every protected endpoint

### security.py
- `hash_password(password)` — bcrypt
- `verify_password(plain, hashed)` — bcrypt verify
- `create_access_token(data, expires_delta)` — JWT with HS256
- Token expires in 7 days (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)

### email_client.py
Sends password reset emails via Gmail SMTP. Uses `fastapi-mail` library.

### logger.py
Rotating file logger:
- Writes to `logs/smartsubs.log`
- Max 5 MB per file, keeps 3 backups
- Format: `timestamp - level - module - message`

### migration.py
Auto-migration script that runs on startup:
- Inspects the database schema
- Adds any missing columns (e.g., `original_language` to `watchlist_items`)
- Handles both PostgreSQL and SQLite syntax differences

### schemas.py
Pydantic models for request/response validation. Key groups:
- **Subscription:** `SubscriptionCreate`, `SubscriptionUpdate`, `Subscription`
- **Watchlist:** `WatchlistItemCreate`, `WatchlistItem`, `WatchlistRatingUpdate`, `WatchlistProgressUpdate`
- **User:** `UserCreate`, `User`, `UserProfileUpdate`, `UserPreferences`
- **AI:** `AIRecommendation`, `AIStrategyItem`, `AIGapItem`, `AIUnifiedResponse`
- **Stats:** `UserStats`, `TopService`, `SpendingCategory`

### routers/auth.py
Google OAuth 2.0 flow:
1. `GET /auth/login/google` → redirects to Google consent screen
2. `GET /auth/callback/google` → receives auth code, exchanges for user info
3. Creates new user or links Google ID to existing email
4. Returns JWT token → redirects to frontend with token in URL
