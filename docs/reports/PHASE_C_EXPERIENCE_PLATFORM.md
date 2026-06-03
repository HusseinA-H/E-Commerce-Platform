# APEX LUXE Enterprise Commerce Platform
## PHASE C: Experience, Internationalization & Personalization Platform

Phase C delivers key global expansion, visual personalization, and behavioral intelligence systems to the APEX LUXE ecosystem. It integrates a lightweight path-rewriting localization layer (Arabic + English), a persistent CSS-variables theme engine (introducing a high-end white editorial Light Mode alongside the default Onyx Dark Mode), an AI-personalized copywriting banner system powered by Groq, and user preference profiling (sizing/fit).

---

## 1. Internationalization System (C.1)

To support global high-end activewear consumers without introducing breaking relative import path disruptions (e.g., reorganizing directories physically under `[locale]` folders), we implemented a **path-rewriting middleware model**.

### Localized Sub-path Rewrite Middleware
- **File:** [middleware.ts](file:///f:/CV/E-Commerce%20Platform/frontend/src/middleware.ts)
- **Behavior:** Intercepts incoming requests. Paths lacking an `en` or `ar` prefix are redirected to the user's preferred locale (read from the `NEXT_LOCALE` cookie, `Accept-Language` headers, or falling back to `en`).
- **Internal Rewrite:** Paths with locale prefixes (e.g., `/ar/shop`) are internally rewritten to root paths (e.g., `/shop`) while injecting the corresponding headers and cookie state. This allows client-side assets and standard routes to work seamlessly.

### Client-Side Translation Context (`useTranslation`)
- **File:** [I18nProvider.tsx](file:///f:/CV/E-Commerce%20Platform/frontend/src/providers/I18nProvider.tsx)
- **RTL & Typography Adaptations:**
  - Dynamic setting of `document.documentElement.dir = 'rtl' | 'ltr'` and `document.documentElement.lang`.
  - When Arabic is active, `[dir="rtl"]` classes apply the high-end Arabic typography font **Cairo** (`--font-cairo`), loaded dynamically using `next/font/google` in `layout.tsx`.
- **Dictionaries:** JSON translation maps are loaded at [en.json](file:///f:/CV/E-Commerce%20Platform/frontend/messages/en.json) and [ar.json](file:///f:/CV/E-Commerce%20Platform/frontend/messages/ar.json).

---

## 2. Dynamic Theme Engine (C.2)

We designed a custom theme engine using CSS Custom Properties and local storage persistence.

### Theme Settings
- Default theme is **Onyx Dark Mode** (industrial cyberpunk aesthetic).
- **Light Mode** introduces a minimal white, editorial luxury sportswear aesthetic (soft concrete grey, crisp off-whites, and black accent borders, maintaining the Volt `#d4ff3f` color scheme as a high-contrast athletic callout).

### Theme Provider
- **File:** [ThemeProvider.tsx](file:///f:/CV/E-Commerce%20Platform/frontend/src/providers/ThemeProvider.tsx)
- Manages states `'light' | 'dark' | 'system'`.
- Synchronizes values into `localStorage` and toggles the `light`/`dark` class and `data-theme` attribute on the `document.documentElement`.
- Added toggling controls in [Navbar.tsx](file:///f:/CV/E-Commerce%20Platform/frontend/src/components/Navbar.tsx).

---

## 3. Sizing & Sizing Affinity System (C.3, C.4)

To prevent visual noise and catalog mismatching, we introduced user preference persistence.

### Database Schema Extension
- **`UserPreference`**: Persists sizing selections (`preferredSizes` like `M,L`), fit selections (`preferredFits` like `Slim,Compression`), notifications read/unread toggle, and custom theme/locale records.
- **`UserStyleDNA`**: Persists computed style personas, color categories weights, and style timelines.
- **`UserBehaviorSnapshot`**: Track counts of viewed categories, colors, and search metrics.

### Sizing Integration Form
- **File:** [profile/page.tsx](file:///f:/CV/E-Commerce%20Platform/frontend/src/app/profile/page.tsx)
- A high-end interactive pill-toggle form allows users to select preferred apparel sizes (`XS` through `XXL`) and style fits (`Slim`, `Regular`, `Loose`, `Compression`, `Oversized`) and save them directly to their account, which synchronizes with the database via `PATCH /personalization/preferences`.

---

## 4. Personalization & Groq Copywriter (C.7)

### Dynamic AI Copywriting Banner
- **Endpoint:** `GET /personalization/banners`
- Computes user style persona and utilizes the **Groq AI (Llama3-8b)** engine to generate a custom, uppercase editorial headline and subtitle (e.g. customized taglines for a "Volt Brutalism" or "Onyx Luxury Gymwear" aesthetic).
- **Client Render:** [page.tsx](file:///f:/CV/E-Commerce%20Platform/frontend/src/app/page.tsx) fetches the AI-generated banner text on mount and falls back gracefully to default translations if the user is unauthenticated or the API is unavailable.
