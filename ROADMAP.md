# Roadmap — SmartSubs

Future features and improvements planned for SmartSubs.

---

## 🔜 Planned Features

### Watchlist Import/Export
Import and export your watchlist to/from various platforms and formats.

**Phase 1 (MVP):**
- [ ] Export watchlist as CSV
- [ ] Export watchlist as JSON
- [ ] Import from SmartSubs CSV/JSON (re-import)
- [ ] Import from IMDb CSV (via TMDB ID lookup)

**Phase 2:**
- [ ] Import from Letterboxd CSV (title+year TMDB search)
- [ ] Import from MyAnimeList XML (MAL→TMDB ID mapping)
- [ ] Import from AniList (GraphQL API, MAL→TMDB mapping)
- [ ] Import from Trakt.tv (OAuth + API)

📄 **Research:** [docs/feature-research/watchlist-import-export.md](docs/feature-research/watchlist-import-export.md)

---

## 💡 Ideas / Backlog

_Add future feature ideas below._
- Advanced search filters for the 'Add New Media' search modal
- Visual indicators for active filters (e.g. badges/chips) with easy 'Clear All' functionality
- Non-AI Based Subscribe Suggestions (Algorithmically suggest services that unlock the most missing watchlist items)
- Personal notes for the watchlist items
- AI search to find shows/movies based on user's description
---

## ✅ Shipped

- **In-App Bug Reporting** — Report Issue button in profile page, creates GitHub Issues via API (category + description)
- **Anime Badge & Filter** — Japanese animation titles show ⚡ ANIME badge, mutually exclusive filter in watchlist
- **Colored Status Themes** — Each watchlist status (Watching, Plan to Watch, Watched, Paused, Dropped) has a unique color applied to tab icons, active tab underlines, and status select dropdown icons
