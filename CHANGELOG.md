# Changelog

All notable changes to the Smart Subscription Manager project.

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
