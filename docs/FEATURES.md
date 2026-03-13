# SmartSubs Features (Codebase Verified)

A completely accurate, codebase-verified list of features active in SmartSubs.

---

## 📊 1. Subscription Management
*   **Track Subscriptions:** Add and manage active streaming services (Netflix, Hulu, Prime Video, etc.).
*   **Country-Isolated Profiles:** Your subscriptions are tied strictly to your selected country profile (US or IN). If you switch from IN to US, your IN subscriptions are safely hidden until you switch back.
*   **Detailed Logging:** Track specific plan names, exact cost, currency, billing cycle (monthly/yearly), start dates, and next billing dates.
*   **Cost Analytics Dashboard:** Displays total monthly cost, count of active subscriptions, projected yearly cost, and your most expensive "Top Service" for your active country profile.
*   **Spending Breakdown:** An interactive, color-coded pie chart showing how your streaming budget is distributed across services.
*   **"Waste Killer":** A dedicated dashboard card that highlights subscriptions where you are paying but getting little to no value (low/zero watchlist overlap).

---

## 🎬 2. Watchlist & Progress Tracking
*   **TMDB Search & Import:** Search for any movie, TV show, or anime using the full TMDB database and add it to your list with rich metadata.
*   **Comprehensive Status Tracking:** Move items between 5 distinct statuses:
    *   `Plan to Watch`
    *   `Watching`
    *   `Watched`
    *   `Paused`
    *   `Dropped`
*   **10-Star Rating System:** Rate items you've watched accurately on a 1-to-10 scale.
*   **Genre Affinity Scoring:** Your 1-10 ratings directly update your personal genre affinity scores under the hood (e.g., scoring an action movie an 8-10 massively boosts action genres in the recommendation engine).
*   **Episodic Progress Tracking:** Specifically for TV Shows/Anime, track exactly which Season and Episode you are currently watching.
*   **"Available On" Badges:** The app cross-references your watchlist items against your active subscriptions. If a match is found, the **Service Name** (e.g., "Netflix") is displayed natively on the media poster.
*   **Anime Detection:** Automatically detects anime and applies a special `⚡ ANIME` badge based on the original Japanese language code and the TMDB Animation genre.

### Advanced Watchlist Filters & Sorting
The Watchlist grid features a fully unified system where all filtering and sorting options can be combined simultaneously to find exactly what you're looking for:
*   **Status Tabs:** Filter exactly by Status (All, Watching, Plan to Watch, Watched, Paused, Dropped).
*   **Media Type:** Filter exclusively for Movies, TV Shows, or Anime.
*   **Genre Filtering:** Select multiple genres (e.g., Action + Sci-Fi). The grid uses AND logic to show only items matching all selections.
*   **Service Availability:** Toggle between `On my services`, `Not on my services`, or filter for a specific service (e.g., "Netflix").
*   **Integrated Search:** A text-based search that narrows down your results in real-time while respecting all active filters.
*   **Dynamic Sorting:** Arrange your specific filtered results by Rating, Title, or Date Added in either Ascending or Descending order.

---

## 🤖 3. Smart Recommendation Engine
*   **Unused Subs (Cancel Suggestions):** Identifies services you are paying for that have **zero** items from your watchlist available to stream, suggesting you cancel them to save money.
*   **Trending (On Your Services):** Pulls globally popular TMDB content that specifically matches your top 3 highest-rated genres, **and is available specifically on the services you already pay for.**
*   **You Might Like:** Finds similar content based *exclusively* on items in your watchlist that you have personally rated highly (7, 8, 9, or 10 stars).
*   **Curator Picks:** High-rated (7.5+ average) hidden gems available *specifically* on the streaming services you already pay for.
*   **Missing Out:** Highly popular shows/movies that are explicitly **NOT** available on the services you currently pay for.

---

## ✨ 4. AI-Powered "Unified Insights" (Google Gemini)
*   **Deep Context Awareness:** Generates personalized advice by ingesting your entire watch history, all your 1-10 star ratings, dropped items, active subscription costs, and your custom preferences (target budget, watching hours/week, household size, preferred languages, viewing style, and deal-breakers).
*   **Smart Strategy:** Tells you definitively to `Keep`, `Cancel`, or `Add` specific streaming services to optimize your budget, accompanied by exact savings calculations.
*   **Personalized Picks:** Suggests exactly what to watch next with a custom, tailored reason explaining why it fits your taste.
*   **Content Gaps:** Identifies highly-rated content you are missing out on because of the services you *aren't* subscribed to.
*   **Admin-Controlled Access Quotas:** Built-in safeguards where an admin must approve AI access, with configurable usage limits (e.g., "unlimited", "daily", or "weekly" limits) to manage Gemini API costs.

---

## ⚙️ 5. User Profile & Account
*   **Hybrid Authentication:** Secure email/password login *and* one-click Google OAuth 2.0. Users can connect/disconnect their Google account at any time.
*   **Preference Snapshots:** If you switch your region (US to IN), the app wipes your preferences so you start fresh in the new country, but secretly saves a snapshot of your old preferences. If you switch back, your old budget and languages are perfectly restored.
*   **Persistent Theming:** Full Dark Mode and Light Mode support across the entire app via CSS variables.

---

## 🛠️ 6. App Infrastructure & Feedback
*   **In-App Bug Reporting (GitHub Integration):** Users can report issues or request features directly from their profile. They can write descriptions and attach up to 3 screenshots. The backend automatically uploads the images to a `.feedback` folder in the GitHub repo and creates a beautifully formatted GitHub Issue.
