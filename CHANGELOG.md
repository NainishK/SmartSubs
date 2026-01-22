# Changelog

All notable changes to the Smart Subscription Manager project.

## [1.3.0] - 2026-01-22

### 🧠 AI Intelligence Center
-   **Metadata Integrity**: Fixed a schema issue where ratings and synopsis were stripped from "Missing Out" items. Now displays rich metadata for all recommendations.
-   **Strict Deduplication**: AI now cross-references your Watchlist to completely eliminate "Missing Out" suggestions you've already added or watched (e.g. "Severance").
-   **Aggressive Text Cleaning**: Improved regex engines to strip phantom "0" and "0.0" artifacts from AI text generation in Smart Strategy cards.
-   **UX Polish**:
    -   **Unified Loading**: "Analyzing..." overlay now visible across all tabs.
    -   **Smart Refresh**: Button now shows "Refreshing..." state, spins, and prevents double-clicks.

### 🐛 Bug Fixes
-   **Mobile UI**: Resolved layout overflow issues in the navigation bar and fixed loading glitches on the Watchlist screen.
-   **Deployment**: Fixed a build-breaking TypeScript error in `MediaDetailsModal.tsx` by updating the `MediaDetails` interface.
-   **Validation**: Enhanced `ai_client.py` validation to perform "deep fetches" if initial TMDB search results lack critical data.

### 🧹 Maintenance
-   **Quota Reset**: Cleared stale cache and reset user AI quotas to ensure fresh data generation after fixes.

## [1.2.0] - 2026-01-10

### 🚀 New Features
-   **Mobile "Pop Out" Details**: The Media Details modal now features a stunning glassmorphism header with a floating poster effect on mobile devices.
-   **Optimized Mobile Ratings**: Redesigned the "Your Rating" and "My Progress" sections to use a compact, side-by-side grid layout, saving screen space.
-   **FanCode Integration**: Added "FanCode" to the service catalog (categorized as Sports/Other) with support for standard plans.
-   **Unified Back-to-Top**: Standardized the "Back to Top" button style (White/Slate) across the Dashboard, Subscriptions, and Recommendations pages.

### 🐛 Bug Fixes
-   **Watchlist Visibility**: Fixed a bug where the "Back to Top" button was hidden on the Desktop Watchlist page.
-   **Build Hotfixes**: Resolved TypeScript implicit `any` errors in the Watchlist page (`map` and `filter` functions) that were blocking deployment.
-   **Data Integerity**: Corrected FanCode's category from OTT to OTHER to prevent it from cluttering the TV/Movie tracking stats.

### 🧹 Maintenance
-   **Code Cleanup**: Removed temporary debug scripts and artifacts.
-   **Deployment**: Ran metadata backfills to ensure data consistency across environments.

## [1.1.0] - 2025-12-28

### 🚀 New Features
-   **Advanced Watchlist Filtering**: Added "More Filters" options to sort by Genre, Release Year, and Rating.
-   **List Search**: Implemented real-time search within the Watchlist to quickly find titles by name.
-   **Compact View**: Introduced the togglable "List View" alongside the grid view for better density on desktop.
