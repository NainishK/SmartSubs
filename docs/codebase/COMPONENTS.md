# Frontend Components — SmartSubs

Detailed documentation of every React component, page, context, and utility in the frontend.

---

## Table of Contents

1. [App Structure](#app-structure)
2. [Pages](#pages)
3. [Components](#components)
4. [Contexts](#contexts)
5. [Utilities (lib/)](#utilities)
6. [Styling System](#styling-system)

---

## App Structure

```
src/
├── app/                        # Next.js App Router (pages)
│   ├── layout.tsx              # Root layout: <html>, <body>, ThemeProvider
│   ├── page.tsx                # Landing page (/)
│   ├── globals.css             # CSS variables, theme definitions
│   ├── login/page.tsx          # Login form
│   ├── signup/page.tsx         # Registration form
│   ├── welcome/page.tsx        # Onboarding wizard
│   ├── search/page.tsx         # TMDB search
│   ├── profile/page.tsx        # User settings
│   └── dashboard/              # Main authenticated area
│       ├── layout.tsx          # Sidebar + main content area
│       ├── page.tsx            # Dashboard home (stats)
│       ├── subscriptions/      # Subscription management
│       ├── watchlist/          # Watchlist management
│       └── recommendations/    # Content recommendations
│
├── components/                 # Reusable React components
├── context/                    # React contexts (global state)
└── lib/                        # Utilities and config
```

### How Routing Works
SmartSubs uses the **Next.js App Router**. Each folder under `app/` with a `page.tsx` becomes a route:
- `app/page.tsx` → `/`
- `app/login/page.tsx` → `/login`
- `app/dashboard/watchlist/page.tsx` → `/dashboard/watchlist`

### Auth Flow
```
1. User visits any /dashboard/* page
2. Dashboard layout calls GET /users/me/
3. api.ts interceptor attaches JWT from localStorage
4. If 401 response → interceptor clears token → redirects to /login
5. Login page → POST /token → stores JWT → redirects to /dashboard
```

---

## Pages

### Landing Page (`app/page.tsx`)
**Route:** `/`
**Purpose:** Marketing/landing page for unauthenticated users.
**Key Features:**
- Hero section with CTA buttons
- Feature highlights carousel
- Links to Login/Signup
- Dark/light theme toggle

**State:**
- `isLoggedIn` — Checks localStorage for token, shows "Dashboard" link if logged in

---

### Login Page (`app/login/page.tsx`)
**Route:** `/login`
**Purpose:** Email/password login + Google OAuth button.
**Flow:**
1. User enters email + password → calls `POST /token`
2. On success → stores `access_token` in localStorage → redirects to `/dashboard`
3. Google button → navigates to `GET /auth/login/google`
4. After OAuth → redirected back with `?token=...` in URL → stores token

**State:** `email`, `password`, `loading`, `error`

---

### Dashboard Home (`app/dashboard/page.tsx`)
**Route:** `/dashboard`
**Purpose:** Overview with stats cards and spending chart.
**API Calls:**
- `GET /users/me/stats` → total cost, active subs, yearly projection
- `GET /users/me/spending` → spending breakdown by service (for pie chart)
- `GET /subscriptions` → subscription list for display

**Key Features:**
- Stats cards (Total Monthly, Active Subs, Yearly Projection, Top Service)
- Spending distribution chart (color-coded by service)
- Quick access to add subscriptions

---

### Dashboard Layout (`app/dashboard/layout.tsx`)
**Purpose:** Wraps all `/dashboard/*` pages with sidebar and common providers.
**Provides:**
- `<Sidebar>` component with toggle (collapsed on mobile)
- `<RecommendationsProvider>` context for caching rec data
- `<ScrollToTop>` button
- Mobile header with hamburger menu

**State:** `isCollapsed` (sidebar toggle), `country` (fetched from user profile)

---

### Subscriptions Page (`app/dashboard/subscriptions/page.tsx`)
**Route:** `/dashboard/subscriptions`
**Purpose:** Full subscription management.
**API Calls:**
- `GET /subscriptions` → list subscriptions
- `GET /services` → available services with logos/plans
- `POST /subscriptions` → add new subscription
- `PUT /subscriptions/{id}` → edit subscription
- `DELETE /subscriptions/{id}` → remove subscription

**Key Features:**
- Service grid with logos
- Plan selection (Basic, Standard, Premium)
- Edit/Delete for existing subs
- Category filter (OTT vs Other)
- Cost display in user's currency

---

### Watchlist Page (`app/dashboard/watchlist/page.tsx`)
**Route:** `/dashboard/watchlist`
**Purpose:** Movie/TV show tracking with filters, ratings, and progress.
**API Calls:**
- `GET /watchlist` → get all watchlist items
- `POST /watchlist/availability` → check which items available on user's services
- `PUT /watchlist/{id}/status` → update watch status
- `PUT /watchlist/{id}/rating` → rate an item
- `PUT /watchlist/{id}/progress` → update season/episode progress
- `DELETE /watchlist/{id}` → remove item

**Key Features:**
- Filter by status (All, Plan to Watch, Watching, Watched)
- Filter by type (All, Movie, TV, Anime) — mutually exclusive
- Filter by availability ("On My Services")
- Grid of MediaCard components
- Click card → MediaDetailsModal pop-up
- Floating "+" button → AddMediaModal

**Anime Detection:** Items with `original_language === "ja"` AND `genre_ids` including `16` (Animation) get the ⚡ ANIME badge.

---

### Recommendations Page (`app/dashboard/recommendations/page.tsx`)
**Route:** `/dashboard/recommendations`
**Purpose:** Content discovery and personalized recommendations.
**API Calls:**
- `GET /recommendations/dashboard` → Watch Now, Cancel, Trending, Explore
- `GET /recommendations/similar` → You Might Like, Curator Picks, Missing Out
- Lazy-loaded: waits for dashboard recs before fetching similar

**Sections (in order):**
1. **Watch Now** — Items in your watchlist available on your subs
2. **Trending** — Popular content matching your genre interests
3. **You Might Like** — Similar to your highly-rated items
4. **Curator Picks** — Hidden gems on services you have
5. **Missing Out** — Content on your services you haven't seen

Each section renders a horizontal scrollable row of `MediaCard` components.

---

### Profile Page (`app/profile/page.tsx`)
**Route:** `/profile`
**Purpose:** User settings and account management.
**API Calls:**
- `GET /users/me/` → load current user data
- `PUT /users/profile` → save changes

**Key Features:**
- Email display (read-only)
- Google account connect/disconnect
- Country/region selector (affects content, currency, subscriptions)
- "Report an Issue" button → opens ReportIssueModal

---

## Components

### MediaCard (`components/MediaCard.tsx`)
**Purpose:** The main card component used everywhere to display a movie/TV show.
**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `item` | `MediaItem` | Movie/TV data (title, poster, rating, etc.) |
| `onSelect` | `() => void` | Called when card is clicked |
| `showAddButton` | `boolean` | Show "+" button to add to watchlist |
| `onAdd` | `() => void` | Called when "+" is clicked |

**Features:**
- Poster image with fallback
- TMDB rating badge (color-coded: green ≥7, yellow ≥5, red <5)
- **⚡ ANIME badge** — shown when `original_language === "ja"` AND genre 16
- **"Available on X"** badge — shown when `available_on` is set
- Hover animation (scale + shadow)

---

### MediaDetailsModal (`components/MediaDetailsModal.tsx`)
**Purpose:** Full-detail pop-up when you click a watchlist item.
**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `item` | `WatchlistItem` | The item to display |
| `visible` | `boolean` | Show/hide modal |
| `onClose` | `() => void` | Close handler |
| `onUpdate` | `(item) => void` | Called when item is updated |
| `onDelete` | `(id) => void` | Called when item is deleted |

**API Calls (internal):**
- `GET /media/{type}/{id}/details` → full TMDB metadata
- `GET /media/{type}/{id}/providers` → streaming availability

**Features:**
- Full backdrop image
- Genre tags
- Overview text
- Streaming provider logos
- Star rating (1-5 stars, mapped to 1-10 internally)
- Watch status selector (Plan to Watch → Watching → Watched)
- Season/Episode progress (for TV shows)
- Delete button

---

### AddMediaModal (`components/AddMediaModal.tsx`)
**Purpose:** Search TMDB and add items to watchlist.
**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `visible` | `boolean` | Show/hide |
| `onClose` | `() => void` | Close handler |
| `onAdd` | `(item) => void` | Called after successful add |

**API Calls:**
- `GET /search?query=...` → TMDB search
- `POST /watchlist` → add selected item

**Features:**
- Search input with debounce
- Results grid with poster thumbnails
- Click to add to watchlist
- Shows "Already in watchlist" for duplicates

---

### AIInsightsModal (`components/AIInsightsModal.tsx`)
**Purpose:** Displays AI-generated insights (picks, strategy, gaps).
**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `visible` | `boolean` | Show/hide |
| `onClose` | `() => void` | Close handler |

**API Calls:**
- `POST /recommendations/insights` → get AI analysis
- `POST /users/me/access/ai` → request/check AI access

**Features:**
- **Access gate:** Shows request button if AI not approved
- **Loading state:** Skeleton with "Analyzing your profile..."
- **3 tabs:** Picks (carousel), Strategy (action cards), Gaps (content cards)
- Each pick shows poster, reason, and streaming service
- Strategy shows Keep/Cancel/Add with savings amounts
- Quota indicator (if limited)

---

### ReportIssueModal (`components/ReportIssueModal.tsx`)
**Purpose:** In-app bug/feature reporting via GitHub Issues.
**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `visible` | `boolean` | Show/hide |
| `onClose` | `() => void` | Close handler |

**API Calls:**
- `POST /feedback/report` → create GitHub issue

**Features:**
- Category selector: 🐛 Bug / 💡 Feature / 💬 Feedback
- Description textarea (max 2000 chars)
- Screenshot attachment (up to 3 images, max 5MB each)
- Success/error feedback with issue number

---

### Sidebar (`components/Sidebar.tsx`)
**Purpose:** Navigation sidebar for dashboard pages.
**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `isCollapsed` | `boolean` | Collapsed state |
| `toggle` | `() => void` | Toggle collapsed |
| `countryCode` | `string` | User's country for flag display |

**Links:**
- Dashboard (home)
- Subscriptions
- Watchlist
- Recommendations
- Profile
- Theme toggle
- Logout

**Features:**
- Collapsible (full → icons only)
- Active page highlight
- Country flag badge
- Responsive (auto-collapses on mobile)

---

### CustomSelect (`components/CustomSelect.tsx`)
**Purpose:** Styled dropdown replacement for native `<select>`.
**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `value` | `string` | Selected value |
| `options` | `{value, label}[]` | Available options |
| `onChange` | `(value) => void` | Selection handler |
| `placeholder` | `string` | Placeholder text |

**Used in:** Watchlist filters, profile country selector, subscription billing cycle.

---

### StarRating (`components/StarRating.tsx`)
**Purpose:** Interactive 1-5 star rating component.
**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `rating` | `number` | Current rating (1-10, displayed as 1-5 stars) |
| `onRate` | `(rating) => void` | Called with 1-10 value when star clicked |
| `readonly` | `boolean` | Disable interaction |

**Conversion:** Stars 1-5 map to API ratings 2,4,6,8,10.

---

### ConfirmationModal (`components/ConfirmationModal.tsx`)
**Purpose:** Generic "Are you sure?" dialog.
**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Show/hide |
| `onClose` | `() => void` | Cancel handler |
| `onConfirm` | `() => void` | Confirm handler |
| `title` | `string` | Dialog title |
| `message` | `string` | Dialog message |
| `confirmLabel` | `string` | Confirm button text |
| `isDangerous` | `boolean` | Red styling for destructive actions |

**Used in:** Disconnect Google account, delete subscription.

---

### Minor Components

| Component | Purpose |
|-----------|---------|
| `ThemeToggle` | Light/dark mode switch. Reads/writes to ThemeContext. Uses Sun/Moon icons. |
| `ScrollToTop` | Floating button that appears when scrolled down. Smooth-scrolls to top. |
| `ServiceIcon` | Renders streaming service logos. Falls back to first-letter circle if no logo. |
| `FeatureCarousel` | Landing page feature carousel with auto-advance. |
| `WasteKiller` | Dashboard card showing subscription "waste score" (unused services). |
| `AuthRedirect` | Simple component that redirects to `/login` if no token in localStorage. |

---

## Contexts

### ThemeContext (`context/ThemeContext.tsx`)
**Purpose:** Manages light/dark theme across the entire app.

**Provides:**
- `theme` — `"light"` or `"dark"`
- `toggleTheme()` — switches theme

**How it works:**
1. On mount: reads `data-theme` from `localStorage`
2. Sets `document.documentElement.setAttribute('data-theme', theme)`
3. All CSS uses `var(--foreground)`, `var(--background)`, etc. which switch based on `data-theme`
4. Persists to `localStorage` so theme survives page refreshes

---

### RecommendationsContext (`context/RecommendationsContext.tsx`)
**Purpose:** Caches recommendation data to avoid refetching when navigating between pages.

**Provides:**
- `dashboardRecs` — cached dashboard recommendations
- `similarRecs` — cached similar content recommendations
- `refreshRecommendations(force?)` — refetch from API

**How it works:**
1. When dashboard loads → fetches recs → stores in context
2. When navigating to `/dashboard/recommendations` → data is already there
3. `refreshRecommendations(true)` forces a server-side recalculation
4. Called automatically after adding/removing watchlist items or subscriptions

---

## Utilities

### api.ts — Axios HTTP Client
**Purpose:** Configured Axios instance for all API calls.

**Configuration:**
- Base URL from `NEXT_PUBLIC_API_URL` env var
- 2-minute timeout (handles Render free-tier cold starts)
- Auto-attaches JWT from localStorage on every request
- Auto-redirects to `/login` on 401 responses (unless `_silentAuth` flag set)
- Strips trailing slash from base URL

### types.ts — TypeScript Interfaces
All shared type definitions. Key interfaces:
- `Subscription` — service name, cost, billing cycle, dates
- `WatchlistItem` — tmdb_id, title, media type, status, rating
- `Recommendation` — type, service, items, poster, scores
- `Service`, `Plan` — streaming service catalog
- `AIRecommendation`, `AIStrategyItem`, `AIGapItem` — AI response types
- `UserPreferences` — budget, languages, household size, etc.

### genres.ts — Genre Mapping
Maps TMDB genre IDs to human-readable names:
```typescript
{ 28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", ... }
```
Used for displaying genre tags on media cards and for the anime detection logic (genre 16 = Animation).

### currency.ts — Currency Formatting
Formats costs by country code:
```typescript
formatCurrency(15.49, "US") → "$15.49"
formatCurrency(499, "IN") → "₹499"
```

---

## Styling System

### Theme Variables (`globals.css`)
All colors are defined as CSS variables that switch based on `data-theme`:

```css
:root {
  --background: #ffffff;
  --foreground: #171717;
  --card: #ffffff;
  --border: #e5e5e5;
  --primary: #3b82f6;
  --muted-foreground: #737373;
  /* ... */
}

[data-theme="dark"] {
  --background: #0a0a0a;
  --foreground: #ededed;
  --card: #1a1a2e;
  --border: #2a2a3e;
  /* ... */
}
```

**Rule:** Never use hardcoded colors in components. Always use `var(--variable-name)`.

### CSS Modules
Every component has a `.module.css` file for scoped styles:
- `MediaCard.module.css` — card layout, badges, hover effects
- `Sidebar.module.css` — sidebar layout, active states, collapse animation
- `dashboard.module.css` — stats grid, spending chart
- etc.

Class names are imported as `styles.className` and are automatically scoped to prevent conflicts.
