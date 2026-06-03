# Centralized Localization & RTL Layout Audit Report

## 1. System Overview
APEX LUXE has transitioned to a fully centralized, direction-aware translation and currency formatting architecture supporting English (`en`) and Arabic (`ar`). All inline locale conditionals and static strings across the storefront, administration panels, vendor portals, and AI systems have been refactored into modular, standard-compliant schema dictionaries.

### Key Architectural Pillars:
* **Central Translation Service (`messages/en.json` & `messages/ar.json`)**: Absolute synchronization of namespaces (`nav`, `home`, `product`, `cart`, `checkout`, `profile`, `tracking`, `loyalty`, `vendor`, `admin`, `aiSearch`, `aiStylist`, `footer`, `notificationsSettings`, `adminInventory`, `adminOrders`, `adminAnalytics`, `adminProducts`, `adminCustomers`, `adminAuditLogs`, `adminAiTelemetry`, `adminCatalogIntelligence`, `adminCoupons`, `adminGlobal`, `adminGlobalIntel`, `errors`).
* **Bidirectional Layout Configuration (`dir="rtl"`)**: Native layout adjustments via Tailwind logical properties combined with targeted `[dir="rtl"]` global overrides in `globals.css`. Hardcoded directional styles (`left-`, `right-`, `mr-`, `ml-`, `pl-`, `pr-`, `border-l-`, `border-r-`) have been refactored to logical positioning (`start-`, `end-`, `ms-`, `me-`, `ps-`, `pe-`, `border-s-`, `border-e-`).
* **Dynamic Currency System (`formatPrice`)**: Fully locale-aligned prices mapping dynamically to `EGP 2,327.50` in English and `٢٬٣٢٧٫٥٠ ج.م` in Arabic.

---

## 2. Component Audits & Changes

### Storefront Pages & Core Views
* **Collections Pages**: Collection descriptions, header details, and breadcrumbs are fully localized. Arrow icons in navigation flip automatically via `rtl:rotate-180`.
* **Wishlist & Shopping Cart**: Summaries, vacant alerts, subtotal equations, and promotional error codes render cleanly using localized keys.
* **Product Detail Page**: Stock thresholds, warning indicators, accordion specs, and sizing checklists are fully localized.
* **Checkout Page**: Secure express inputs, credit card cvv/expiry fields, success screens, and order confirmation data consumption is dynamic. Left/right grid alignment uses direction-aware grid margins.
* **Consignment Tracking**: Truck icons flip direction (`rtl:-scale-x-100`) and map coordinate overlays translate positions (`left` vs `right`) dynamically using local key maps to prevent visual breaks.

### Admin Dashboard (`/admin`)
* **Analytics Metrics & Telemetry Feed**: Recent transaction items, CLV graphs, status tags, vectors rebuilding status, and telemetry labels consume translation files.
* **Logical Alignment Refactoring**: Table row headers use logical text alignment (`text-start` and `text-end`), and sidebar lines use logical borders (`border-e` / `border-inline-end`).

### Vendor Portal (`/vendor`)
* **Onboarding & Operations**: Stripe Express checkout configurations, gross revenues, platform split commissions, and inventory thresholds use localized keys and format dynamically via `formatPrice(...)`.
* **Visuals Settings**: File url upload labels, address forms, and icon alignments use logical placements (`start-3` instead of `left-3`, `ps-10 pe-4` instead of `pl-10 pr-4`).

### AI Search Module (`/src/components/AISearch.tsx`)
* **Tab Selection & Placeholders**: Semantic search tags, visual search description paragraphs, image URL inputs, and autocomplete dropdowns are fully localized.
* **Stateful Messages & Scores**: AI retrieval pipeline descriptions, narrative explanation sections, cache status, and relevance compatibility score scales render correctly in English and Arabic.

---

## 3. Verification Details
* **Next.js Dev and Production Builds**: Checked compilation and page asset production bundles for errors or hydration warnings.
* **Arabic Layout (RTL)**:
  * Text inputs, cursor positioning, and placeholders align to the right.
  * Sidebars, navigation links, and floating assistant grids mirror to the right edge.
  * Swapping layout alignments is achieved with logical grid columns, flex properties, and borders.
* **Dynamic Currency Representation**:
  * English price: `EGP 2,327.50`
  * Arabic price: `٢٬٣٢٧٫٥٠ ج.م`
