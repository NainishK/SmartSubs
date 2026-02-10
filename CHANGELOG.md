# Changelog

All notable changes to the Smart Subscription Manager project.

## [1.4.0] - 2026-02-10

### 🚀 Major Features
-   **Profile Dashboard**: Renamed "Settings" to "Profile", creating a dedicated home for identity management.
-   **Google Account Linking**:
    -   **Connect**: Existing email users can now link their Google Account for one-click login.
    -   **Disconnect**: Added safe unlink functionality with password verification to prevent lockouts.
-   **Production OAuth**: Implemented robust environment-based configuration (`FRONTEND_URL`) to support separate Dev/Prod OAuth flows.

### ✨ UX Improvements
-   **Custom Confirmations**: Replaced native browser alerts with a cohesive `ConfirmationModal` for dangerous actions (Logout, Disconnect).
-   **General Settings**: Consolidated regional preferences into a scalable "General Settings" section.

### 🧹 Maintenance
-   **Code Cleanup**: Organized backend structure by moving debug scripts to `backend/scripts/`.
-   **Security**: Enforced password checks before allowing OAuth unlinking.

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

### 🚀 Major Features
-   **Media Lifecycle**: Added **"Paused"** and **"Dropped"** statuses to better track your viewing habits (beyond just Watching/Plan to Watch).
-   **Power Filters**:
    -   **By Type**: Filter specifically for *Movies* or *TV Shows*.
    -   **By Service**: "Not on My Services" filter to quickly find content you need to rent/buy or subscribe for.
    -   **By Provider**: Filter by specific streaming platforms (e.g., Netflix, Prime).
-   **Progress Tracking**: Integrated Season/Episode counters for TV shows.
-   **Layout Options**: Toggle between **Grid View** (Visual) and **List View** (Compact).

### ✨ Improvements
-   **Real-Time Search**: Instant filtering by title.
-   **Media Details Modal**: Comprehensive details view for Synopsis, Cast, and Provider info.
-   **Rating System**: 10-star rating capability with visual star/half-star feedback.
