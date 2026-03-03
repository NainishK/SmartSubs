# Watchlist Import/Export — Research Findings

## Current Data Model

Your `WatchlistItem` stores: `tmdb_id`, `title`, `media_type`, `status`, `user_rating`, `poster_path`, `genre_ids`, progress (`current_season/episode`), and `added_at`. The key identifier is **TMDB ID** — this makes cross-platform compatibility straightforward.

---

## Export Options

### Option A: CSV Export (Recommended — Simple)
Export the user's watchlist as a `.csv` file. Universal, works with Excel/Google Sheets, and compatible with other apps.

**Columns:** `title`, `media_type`, `tmdb_id`, `status`, `user_rating`, `genre_ids`, `current_season`, `current_episode`, `added_at`

**Pros:** Dead simple, users can open in any spreadsheet, easy to share
**Cons:** No poster images, flat structure

### Option B: JSON Export
Export as a structured `.json` file. Richer data, supports nested fields.

**Pros:** Preserves all data including nested progress, easy to re-import
**Cons:** Less user-friendly for non-technical users

### Option C: Both (CSV + JSON)
Offer both formats via a dropdown or two buttons. Best of both worlds.

---

## Import Options

### 1. Re-import from SmartSubs Export (CSV or JSON)
Parse the exported file and bulk-create watchlist items. Duplicate detection via `tmdb_id`.

### 2. Import from IMDb CSV
IMDb exports contain: `Const` (IMDb ID like `tt1234567`), `Title`, `Year`, `Title Type`, `Genres`, `IMDb Rating`.

**Mapping strategy:**
- Use TMDB's `/find/{imdb_id}?external_source=imdb_id` API to convert IMDb IDs → TMDB IDs
- Map `Title Type` → `media_type` (movie/tv)
- Set `status` to `plan_to_watch` by default (IMDb doesn't track watch status)

### 3. Import from Letterboxd CSV
Letterboxd exports contain: `Name`, `Year`, `Letterboxd URI`, and optionally `Rating`.

**Mapping strategy:**
- Search TMDB by title + year via `/search/movie?query={name}&year={year}`
- Map `Rating` (0.5–5.0 scale) → your 1–10 scale (multiply by 2)
- Letterboxd is movies-only, so `media_type = "movie"`

### 4. Import from Trakt.tv (API-based)
Trakt API returns JSON with `tmdb` IDs directly — easiest integration.

**Mapping strategy:**
- Use Trakt's `/sync/watchlist` endpoint — items already include `tmdb` IDs
- Requires OAuth or user's Trakt API key

### 5. Import from MyAnimeList (XML)
MAL exports anime/manga lists as **XML files** via account settings → Import/Export.

**XML contains:** `series_animedb_id` (MAL ID), `series_title`, `my_status` (Watching/Completed/Plan to Watch/Dropped/On-Hold), `my_score` (0–10), `my_watched_episodes`, `series_episodes`.

**Mapping strategy:**
- MAL uses its own IDs, NOT TMDB IDs
- Community mapping DBs exist: [Otaku Mappings](https://github.com/otaku-codes/anime-mappings), [Shinkrodb](https://github.com/shinkrodb) — both map MAL ID → TMDB ID
- Fallback: search TMDB by title via `/search/tv?query={title}`
- Map `my_status` → your `status` (Watching→watching, Completed→watched, Plan to Watch→plan_to_watch)
- `my_score` maps directly to `user_rating` (both 1–10)

### 6. Import from AniList (GraphQL API)
AniList uses a **GraphQL API** — no export file, but public lists can be queried by username.

**Query example:**
```graphql
{ MediaListCollection(userName: "xxx", type: ANIME) {
    lists { name entries { media { idMal title { romaji english } } score status progress } }
}}
```

**Mapping strategy:**
- AniList returns `idMal` (MAL ID) for most entries — use the same MAL→TMDB mapping
- Also returns `status` (CURRENT/COMPLETED/PLANNING/DROPPED/PAUSED) and `score` (0–100)
- Map `score` ÷ 10 → `user_rating`, `progress` → `current_episode`
- Rate limit: 90 req/min, no API key needed for public lists

> [!IMPORTANT]
> MAL/AniList imports require a MAL ID → TMDB ID mapping step. This adds complexity and may not find matches for all anime (especially obscure OVAs). Consider Phase 2.

---

## Recommended Approach

### Phase 1 (MVP) — Ship these first
| Feature | Source | Effort |
|---------|--------|--------|
| **Export** | CSV + JSON download | Low |
| **Import** | SmartSubs CSV/JSON re-import | Medium |
| **Import** | IMDb CSV | Medium — TMDB lookup per item |

### Phase 2
| Feature | Source | Effort |
|---------|--------|--------|
| **Import** | Letterboxd CSV | Medium — title+year TMDB search |
| **Import** | MyAnimeList XML | Medium-High — MAL→TMDB ID mapping |
| **Import** | AniList (GraphQL) | Medium-High — same MAL→TMDB mapping |
| **Import** | Trakt.tv API | High — OAuth + API keys |

---

## Implementation Sketch

### Backend
- `GET /watchlist/export?format=csv` — returns CSV file download
- `GET /watchlist/export?format=json` — returns JSON file download
- `POST /watchlist/import` — accepts file upload (CSV/JSON), parses, deduplicates by `tmdb_id`, bulk inserts

### Frontend
- **Export:** Button(s) in watchlist page header (e.g. ⬇️ Export → CSV / JSON)
- **Import:** Modal with file drag-and-drop, format auto-detection, preview of items to import, duplicate warning

### Duplicate Handling
- Skip items where `tmdb_id` already exists in user's watchlist
- Show count: "Imported 15 new items, skipped 3 duplicates"
