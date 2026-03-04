# API Reference — SmartSubs

Full request/response examples for every API endpoint. Base URL: `http://localhost:8000` (dev) or your production URL.

All authenticated endpoints require: `Authorization: Bearer <JWT_TOKEN>`

---

## Auth

### POST `/users/` — Register
```json
// Request
{
  "email": "user@example.com",
  "password": "mypassword123",
  "country": "US"
}

// Response (200)
{
  "id": 1,
  "email": "user@example.com",
  "country": "US",
  "is_active": true,
  "ai_allowed": false,
  "ai_access_status": "none",
  "subscriptions": [],
  "watchlist": []
}

// Error (400)
{ "detail": "Email already registered" }
```

### POST `/token` — Login
```json
// Request (form-data, NOT JSON)
// Content-Type: application/x-www-form-urlencoded
username=user@example.com&password=mypassword123

// Response (200)
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}

// Error (401)
{ "detail": "Incorrect username or password" }
```

> **Note:** The `username` field is the user's email. This is a FastAPI/OAuth2 convention.

### GET `/users/me/` — Get Current User 🔒
```json
// Response (200)
{
  "id": 1,
  "email": "user@example.com",
  "country": "IN",
  "avatar_url": "https://lh3.googleusercontent.com/...",
  "google_id": "123456789",
  "is_active": true,
  "ai_allowed": true,
  "ai_access_status": "approved",
  "preferences": "{\"target_budget\":500,\"languages\":[\"English\",\"Hindi\"]}",
  "subscriptions": [...],
  "watchlist": [...]
}
```

### GET `/auth/login/google` — Start Google OAuth
Redirects browser to Google consent screen. No request body needed.

### GET `/auth/callback/google` — OAuth Callback
Handled automatically by Google. Redirects to `FRONTEND_URL/login?token=<JWT>`.

---

## Profile

### PUT `/users/profile` — Update Profile 🔒
```json
// Request — change country
{
  "country": "IN"
}

// Request — update preferences
{
  "preferences": {
    "target_budget": 500,
    "target_currency": "INR",
    "watch_time_weekly": 15,
    "household_size": "Solo",
    "languages": ["English", "Hindi"],
    "viewing_style": "Binge",
    "devices": ["Phone", "TV"],
    "deal_breakers": ["Ads"]
  }
}

// Response (200) — Updated user object
{ "id": 1, "email": "...", "country": "IN", ... }
```

### POST `/users/me/access/ai` — Request AI Access 🔒
```json
// Response (200) — Already approved
{ "status": "approved", "message": "You have been approved! Please refresh." }

// Response (200) — New request
{ "status": "requested", "message": "Access requested. Waiting for approval." }
```

---

## Subscriptions

### POST `/subscriptions/` — Add Subscription 🔒
```json
// Request
{
  "service_name": "Netflix",
  "cost": 15.49,
  "currency": "USD",
  "billing_cycle": "monthly",
  "start_date": "2024-01-15",
  "next_billing_date": "2024-02-15",
  "is_active": true,
  "category": "OTT",
  "country": "US"
}

// Response (200)
{
  "id": 5,
  "user_id": 1,
  "service_name": "Netflix",
  "cost": 15.49,
  "currency": "USD",
  "billing_cycle": "monthly",
  "start_date": "2024-01-15",
  "next_billing_date": "2024-02-15",
  "is_active": true,
  "category": "OTT",
  "country": "US",
  "logo_url": "/logos/netflix.svg"
}
```

### GET `/subscriptions/?country=US` — List Subscriptions 🔒
```json
// Response (200)
[
  {
    "id": 5,
    "service_name": "Netflix",
    "cost": 15.49,
    "billing_cycle": "monthly",
    "is_active": true,
    "logo_url": "/logos/netflix.svg",
    ...
  },
  {
    "id": 6,
    "service_name": "Disney Plus",
    "cost": 7.99,
    ...
  }
]
```

### PUT `/subscriptions/{id}` — Update Subscription 🔒
```json
// Request (partial update — only send fields to change)
{
  "cost": 22.99,
  "billing_cycle": "yearly"
}

// Response (200) — Full updated subscription object
```

### DELETE `/subscriptions/{id}` — Delete Subscription 🔒
```json
// Response (200) — Deleted subscription object
```

---

## Watchlist

### POST `/watchlist/` — Add to Watchlist 🔒
```json
// Request (minimal — backend enriches from TMDB)
{
  "tmdb_id": 27205,
  "title": "Inception",
  "media_type": "movie"
}

// Request (full — with optional fields from frontend search)
{
  "tmdb_id": 27205,
  "title": "Inception",
  "media_type": "movie",
  "poster_path": "/9gk7adHYeDvHkCSEhnivolCNtQb.jpg",
  "vote_average": 8.4,
  "overview": "A thief who steals corporate secrets...",
  "genre_ids": [28, 878, 12],
  "original_language": "en"
}

// Response (200)
{
  "id": 12,
  "user_id": 1,
  "tmdb_id": 27205,
  "title": "Inception",
  "media_type": "movie",
  "poster_path": "/9gk7adHYeDvHkCSEhnivolCNtQb.jpg",
  "vote_average": 8.4,
  "overview": "A thief who steals corporate secrets...",
  "status": "plan_to_watch",
  "user_rating": null,
  "available_on": null,
  "genre_ids": "[28, 878, 12]",
  "original_language": "en",
  "current_season": 0,
  "current_episode": 0,
  "total_seasons": 0,
  "total_episodes": 0,
  "added_at": "2024-03-04T10:30:00"
}
```

### GET `/watchlist/` — Get Watchlist 🔒
```json
// Response (200) — Array of all watchlist items
```

### DELETE `/watchlist/{id}` — Remove from Watchlist 🔒
```json
// Response (200) — Deleted item object
```

### PUT `/watchlist/{id}/status` — Update Watch Status 🔒
```json
// Request query param: ?status=watching
// Valid values: "plan_to_watch", "watching", "watched"

// Response (200) — Updated item
```

### PUT `/watchlist/{id}/rating` — Rate Item 🔒
```json
// Request
{ "rating": 8 }
// rating: 1-10 scale

// Response (200) — Updated item with new rating
// Side effect: Updates UserInterest genre scores
```

### PUT `/watchlist/{id}/progress` — Update Watch Progress 🔒
```json
// Request (for TV shows)
{
  "current_season": 2,
  "current_episode": 5
}

// Response (200) — Updated item
```

### POST `/watchlist/availability` — Check Availability 🔒
```json
// Request — array of item IDs to check
[12, 15, 18, 22]

// Response (200) — map of tmdb_id → service name
{
  "27205": "Netflix",
  "1396": "Disney Plus"
}
// Items not available on any user subscription are not included
```

---

## Recommendations

### GET `/recommendations/dashboard` — Dashboard Recs 🔒
```json
// Response (200)
[
  {
    "type": "watch_now",
    "service_name": "Netflix",
    "logo_url": "/logos/netflix.svg",
    "items": ["Inception", "Dark Knight"],
    "reason": "Available on your Netflix subscription",
    "cost": 0,
    "savings": 0,
    "score": 95,
    "tmdb_id": 27205,
    "media_type": "movie",
    "poster_path": "/9gk7adHYeDvHkCSEhnivolCNtQb.jpg",
    "vote_average": 8.4,
    "overview": "A thief who steals...",
    "genre_ids": [28, 878],
    "original_language": "en"
  },
  {
    "type": "cancel",
    "service_name": "Apple TV+",
    "reason": "No watchlist items available",
    "cost": 6.99,
    "savings": 6.99,
    ...
  },
  {
    "type": "trending",
    ...
  }
]
```

### GET `/recommendations/similar?force_refresh=false` — Similar Content 🔒
```json
// Response (200) — Same structure as dashboard but types are:
// "similar_content", "global_trending"
```

### POST `/recommendations/refresh?type=dashboard` — Force Refresh 🔒
```json
// Response (200)
{ "message": "Recommendations refreshed" }
```

---

## AI Intelligence

### POST `/recommendations/insights?force_refresh=false` — AI Insights 🔒
```json
// Response (200)
{
  "picks": [
    {
      "title": "Severance",
      "reason": "Based on your love for psychological thrillers...",
      "service": "Apple TV+",
      "tmdb_id": 95396,
      "media_type": "tv",
      "poster_path": "/lFf6DEhpEelCO3STMk6j9NkT5hj.jpg",
      "vote_average": 8.3,
      "overview": "Mark leads a team of office workers...",
      "logo_url": "/logos/apple-tv-plus.svg"
    }
  ],
  "strategy": [
    {
      "action": "Cancel",
      "service": "Peacock",
      "reason": "Rarely used, saves $4.99/month",
      "savings": 4.99
    },
    {
      "action": "Keep",
      "service": "Netflix",
      "reason": "Most-watched service with 12 items in your watchlist"
    }
  ],
  "gaps": [
    {
      "title": "The Bear",
      "service": "Hulu",
      "reason": "Award-winning drama matching your taste",
      "tmdb_id": 136311,
      "poster_path": "/...",
      "vote_average": 8.1
    }
  ],
  "warning": null
}

// Error (403)
{ "detail": "AI access is disabled for your account." }

// Error (429)
{ "detail": "AI limit reached (5/5 per day). Upgrade for more." }
```

---

## Services & Media

### GET `/services` — List Streaming Services 🔒
```json
// Response (200)
[
  { "id": 1, "name": "Netflix", "logo_url": "/logos/netflix.svg", "category": "OTT", "country": "US", "plans": [...] },
  { "id": 2, "name": "Disney Plus", ... }
]
```

### GET `/services/{id}/plans` — Service Plans 🔒
```json
// Response (200)
[
  { "id": 1, "name": "Basic", "cost": 6.99, "currency": "USD", "billing_cycle": "monthly" },
  { "id": 2, "name": "Standard", "cost": 15.49, "currency": "USD", "billing_cycle": "monthly" },
  { "id": 3, "name": "Premium", "cost": 22.99, "currency": "USD", "billing_cycle": "monthly" }
]
```

### GET `/search?query=inception` — Search TMDB 🔒
```json
// Response (200)
{
  "results": [
    {
      "id": 27205,
      "title": "Inception",
      "media_type": "movie",
      "poster_path": "/9gk7adH...",
      "vote_average": 8.4,
      "overview": "A thief who steals...",
      "genre_ids": [28, 878, 12],
      "original_language": "en",
      "release_date": "2010-07-16"
    }
  ]
}
```

### GET `/media/{type}/{id}/providers` — Watch Providers 🔒
```json
// Example: GET /media/movie/27205/providers
// Response (200)
{
  "flatrate": [
    { "provider_id": 8, "provider_name": "Netflix", "logo_path": "/..." },
    { "provider_id": 337, "provider_name": "Disney Plus", "logo_path": "/..." }
  ],
  "rent": [...],
  "buy": [...]
}
```

### GET `/media/{type}/{id}/details` — Full Media Details 🔒
```json
// Example: GET /media/movie/27205/details
// Response (200)
{
  "id": 27205,
  "title": "Inception",
  "genres": [{"id": 28, "name": "Action"}, {"id": 878, "name": "Science Fiction"}],
  "runtime": 148,
  "release_date": "2010-07-16",
  "vote_average": 8.364,
  "overview": "A thief who steals corporate secrets...",
  "poster_path": "/9gk7adH...",
  "backdrop_path": "/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
  "original_language": "en"
}
```

---

## Stats

### GET `/users/me/stats?country=US` — User Stats 🔒
```json
// Response (200)
{
  "total_cost": 38.47,
  "active_subs": 3,
  "yearly_projection": 461.64,
  "top_service": {
    "name": "Netflix",
    "cost": 15.49,
    "currency": "USD"
  }
}
```

### GET `/users/me/spending?country=US` — Spending Breakdown 🔒
```json
// Response (200) — Top 3 + Others
[
  { "name": "Netflix", "cost": 15.49, "color": "#0070f3" },
  { "name": "Disney Plus", "cost": 7.99, "color": "#7928ca" },
  { "name": "Hulu", "cost": 7.99, "color": "#f5a623" },
  { "name": "Others", "cost": 6.99, "color": "#e0e0e0" }
]
```

---

## Bug Reporting

### POST `/feedback/report` — Report Issue 🔒
```json
// Request (without screenshot)
{
  "category": "bug",
  "description": "The watchlist page crashes when I filter by Anime"
}

// Request (with screenshots, up to 3)
{
  "category": "feature",
  "description": "Would be great to have a dark mode toggle on mobile",
  "screenshots": [
    { "base64": "iVBORw0KGgo...", "name": "screenshot1.png" },
    { "base64": "iVBORw0KGgo...", "name": "screenshot2.png" }
  ]
}

// Response (200)
{
  "message": "Issue reported successfully",
  "issue_number": 42
}

// Category values: "bug", "feature", "other"
// Creates a labeled GitHub Issue in the configured repo
```
