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
- Colored theme for statuses (Plan to Watch, Watching, Watched, Paused, Dropped)
- Advanced search filters for the 'Add New Media' search modal
- Visual indicators for active filters (e.g. badges/chips) with easy 'Clear All' functionality
- Non-AI Based Subscribe Suggestions (Algorithmically suggest services that unlock the most missing watchlist items)

---

## ✅ Shipped

- **In-App Bug Reporting** — Report Issue button in profile page, creates GitHub Issues via API (category + description)
- **Anime Badge & Filter** — Japanese animation titles show ⚡ ANIME badge, mutually exclusive filter in watchlist
