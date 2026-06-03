# PROJECT REPORT: APEX LUXE (VERSION 1)

## Project Overview

APEX LUXE is an enterprise-grade digital commerce platform designed to operate at the intersection of premium retail, multi-tenant software-as-a-service (SaaS), and multi-vendor marketplaces. Built on a decoupled monorepo architecture, the platform features a Next.js 15 App Router frontend communicating with a modular NestJS 11 backend. High-integrity data management is powered by Microsoft SQL Server via Prisma ORM, while Redis and BullMQ handle caching, rate-limiting, and queue-based background processing.

---

## Business Vision

The platform is designed to offer a luxury e-commerce storefront for customers while providing SaaS storefront builders for boutique brands. By integrating an advanced multi-vendor marketplace, individual vendors can onboard using Stripe Connect and publish their catalogs, with the platform automatically handling order splits and commission payouts. Advanced AI agents personalize the retail journey, suggesting outfits, computing style profiles, optimizing prices based on demand, and recovering abandoned shopping carts.

---

## Technical Architecture

The codebase enforces a clean separation of concerns:
* **Presentation Layer**: Static and server-rendered interfaces powered by Next.js and optimized for performance edge deployment.
* **API Gateway & Core Logic**: Modular NestJS application grouping services, controllers, and interceptors into bounded contexts.
* **Asynchronous Execution Layer**: A Redis-backed BullMQ cluster processing heavy webhooks, personalization builds, and recurring cron operations.
* **Persistence Layer**: SQL Server databases managed via type-safe Prisma clients with automated multi-tenant isolation interceptors.

---

## Frontend Architecture

The [frontend directory](file:///f:/CV/E-Commerce%20Platform/frontend) utilizes a robust Next.js App Router structure:
* **Routing**: The application spans 38 page routes segregating customer storefronts, vendor dashboards, and platform admin panels.
* **State Management**:
  * Client-side states (such as active carts and user wishlists) are managed via [Zustand](file:///f:/CV/E-Commerce%20Platform/frontend/src/store) with persistent middleware.
  * Server-state synchronizations are handled via React Query (`@tanstack/react-query`) to ensure optimistic updates and cache invalidations.
* **Styling**: Tailored Tailwind CSS utilizing curating variables, micro-animations (via `framer-motion`), and responsive design tokens.
* **PWA Capabilities**: Installable capabilities enabled through `@ducanh2912/next-pwa` in [next.config.ts](file:///f:/CV/E-Commerce%20Platform/frontend/next.config.ts). A service worker ([sw.js](file:///f:/CV/E-Commerce%20Platform/frontend/public/sw.js)) intercepts networking, caching files for offline browsing ([offline.html](file:///f:/CV/E-Commerce%20Platform/frontend/public/offline.html)).

---

## Backend Architecture

The [backend directory](file:///f:/CV/E-Commerce%20Platform/backend) is organized as a modular NestJS application:
* **Modularity**: Business modules encapsulate logic into bounded contexts. The application loads 41 modules inside [AppModule](file:///f:/CV/E-Commerce%20Platform/backend/src/app.module.ts).
* **Validation**: Input payloads are verified before execution using `class-validator` pipes, protecting endpoints against mass assignment.
* **Guards**: State access is protected using JWT authentication filters and role guards ([RolesGuard](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/auth/guards/roles.guard.ts)) verifying permissions for `customer`, `vendor`, and `admin` roles.
* **Queue-Based Job Offloading**: Long-running financial webhooks and AI analytical scripts are offloaded to BullMQ workers, maintaining sub-10ms response times for external clients.

---

## AI Systems

APEX LUXE implements a suite of AI modules powered by Groq LLM API integrations:
* **AI Personal Stylist**: Analyzes consumer images to score outfits, detect colors, and suggest matching products using vision models ([OutfitAnalysisService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/ai-stylist/outfit-analysis.service.ts)).
* **Personalization & Style DNA**: Combines purchase history and browsed categories to build a consumer [UserStyleDNA](file:///f:/CV/E-Commerce%20Platform/backend/prisma/schema.prisma) profile.
* **AI Dynamic Pricing**: Optimizes pricing using `llama-3.3-70b-specdec` by analyzing inventory stocks and sales velocity ([AiPricingService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/global-commerce/services/pricing.service.ts)).
* **AI Forecasting**: Generates 30-day category restock schedules and region-based demand predictions.
* **AI Campaign Copys**: Generates targeted promotional content and email layouts based on RFM customer segment outputs.

---

## Marketplace Systems

Multi-vendor capability is natively integrated into the checkout and ledger systems:
* **Onboarding**: Third-party sellers register via the [VendorModule](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/vendor/vendor.module.ts) which generates Stripe Connect Express authentication links.
* **Commission splits**: During checkouts, payments are automatically split. The platform deducts a commission rate (default 15%) before issuing payouts.
* **Dashboards**: Separate vendor portals track products, orders, and payouts ([vendor/page.tsx](file:///f:/CV/E-Commerce%20Platform/frontend/src/app/vendor/page.tsx)).

---

## SaaS Systems

The platform supports a multi-tenant infrastructure:
* **Provisioning**: The store builder registers brand tenants, provisioning subdomains, theme setups, and CMS assets ([TenantService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/saas/tenant.service.ts)).
* **DNS Verification**: Brands can map custom domains. The platform checks DNS routing dynamically by running CNAME lookups ([DomainService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/saas/domain.service.ts)).
* **SaaS Billing**: Subscriptions (Starter, Growth, Pro, Enterprise plans) are enforced. Limit-checking middlewares restrict product creation and warehouse additions based on active plan quotas.
* **Isolation**: Safe database queries are enforced via `extendedClient` interceptors in [PrismaService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/prisma/prisma.service.ts).

---

## Global Commerce Systems

Logistics are designed for international scale:
* **Multi-Currency**: Automatic currency persists regional selections, converting catalog pricing dynamically based on current [ExchangeRate](file:///f:/CV/E-Commerce%20Platform/backend/prisma/schema.prisma) tables.
* **Multi-Region**: Regions customize local sales taxes, VAT rules, and base carrier rates.
* **Multi-Warehouse**: Warehouses allocate stock locally ([WarehouseService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/global-commerce/warehouse.service.ts)). Inventory can be shifted between warehouses using transfer records.

---

## Infrastructure Systems

* **Redis Caching**: Caches product catalog requests and compiled AI analytics, reducing SQL Server connection overhead.
* **BullMQ Resilience**: Queue client connections use failover parameters, preventing application crashes if Redis is temporarily offline at startup.
* **Docker Deployments**: Dual-stage Docker files are configured for development dependencies and containerized production environments.

---

## Security Systems

* **Cryptographic Verification**: Stripe webhooks utilize raw body buffers to verify signatures.
* **Token Hardening**: JWT tokens are issued using HttpOnly, `__Host-` prefixed, and secure cookies.
* **Data Sanitization**: Query parameters are parsed strictly via DTO decorators, preventing prototype pollution.
* **Multi-Tenant Barriers**: Queries on 12 tenant-level models are automatically filtered by `tenantId`.

---

## Performance Systems

* **Lighthouse Core Web Vitals**: Next.js configurations restrict memory footprint, optimize images, and transpile packages to reduce bundle sizes.
* **Edge Routing**: Segmented layouts isolate admin files, minimizing chunk weights on consumer landing pages.

---

## Current Metrics

The platform consists of the following audited metrics:

* **Next.js Pages/Routes**: **38** routes (including admin views, vendor portals, profile pages, and auth callbacks).
* **NestJS Modules**: **41** registered modules (including 36 custom feature modules and 5 core framework/utility modules).
* **Prisma Models**: **77** database models defining relational structures, logs, and SaaS parameters in [schema.prisma](file:///f:/CV/E-Commerce%20Platform/backend/prisma/schema.prisma).
* **AI Services**: **14** specialized AI services (managing styling, styling vision, dynamic pricing, demand forecasting, style DNA, campaigns, and retention).
* **BullMQ Queues**: **4** active background job queues (`stripe-webhooks`, `ai`, `abandoned-cart`, and `ai-intelligence`).
* **Dashboards**: **12** distinct dashboard panels (7 Admin panels including SaaS billing, Global configurations, Executive AI, Search analytics, Catalog, Telemetry, and main stats; 5 Vendor panels including overview, products, orders, payouts, and settings).
* **NestJS Controllers (APIs)**: **34** controllers exposing REST endpoints.

---

## Feature Matrix

| Feature Domain | Sub-Feature | Status | Verification Context / Code References |
| :--- | :--- | :---: | :--- |
| **Auth & Security** | JWT HttpOnly Auth | **Completed** | [AuthService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/auth/auth.service.ts) & [JwtStrategy](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/auth/strategies/jwt.strategy.ts) |
| | Roles RBAC Guards | **Completed** | [RolesGuard](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/auth/guards/roles.guard.ts) |
| **E-Commerce Storefront**| Catalog & Wishlist | **Completed** | [ProductsController](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/products/products.controller.ts) & [WishlistController](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/wishlist/wishlist.controller.ts) |
| | Verified Reviews | **Completed** | [ReviewsService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/reviews/reviews.service.ts) |
| **Marketplace** | Stripe Connect Onboarding | **Completed** | [VendorController](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/vendor/vendor.controller.ts) |
| | Commission Splits | **Completed** | [OrdersService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/orders/orders.service.ts) |
| **AI Experience** | vision Outfit Stylist | **Completed** | [OutfitAnalysisService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/ai-stylist/outfit-analysis.service.ts) |
| | Stylist Context Chat | **Completed** | [AiStylistController](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/ai-stylist/ai-stylist.controller.ts) |
| | User Style DNA | **Completed** | [StyleDnaService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/personalization/style-dna.service.ts) |
| **Retention** | Wishlist Stock Alerts | **Completed** | [WishlistIntelligenceService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/wishlist/wishlist-intelligence.service.ts) |
| | Abandoned Cart Recovery | **Completed** | [AbandonedCartService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/retention/abandoned-cart.service.ts) |
| | Loyalty Tiers | **Completed** | [LoyaltyService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/loyalty/loyalty.service.ts) |
| | Referral Program | **Completed** | [ReferralService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/referral/referral.service.ts) |
| **Omnichannel** | FCM Push Integrations | **Completed** | [PushService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/notifications/push.service.ts) |
| | Omnichannel Gateway | **Completed** | [NotificationsService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/notifications/notifications.service.ts) |
| | QR Commerce Codes | **Completed** | [QrService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/qr/qr.service.ts) |
| | Social Catalogs Feed | **Completed** | [SocialCommerceService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/social-commerce/social-commerce.service.ts) |
| **Global Commerce** | Currency persisted switcher | **Completed** | [ExchangeRateService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/global-commerce/currency.service.ts) |
| | Warehouse Transfers | **Completed** | [WarehouseService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/global-commerce/warehouse.service.ts) |
| | Regional Price override | **Completed** | [RegionService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/global-commerce/region.service.ts) |
| **AI Intelligence** | AI pricing suggestions | **Completed** | [AiPricingService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/global-commerce/services/pricing.service.ts) |
| | AI Demand forecasting | **Completed** | [AiForecastingService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/global-commerce/services/forecasting.service.ts) |
| | AI Executive Dashboard | **Completed** | [AiExecutiveService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/global-commerce/services/executive.service.ts) |
| **SaaS Billing** | Subscription Plans Quotas | **Completed** | [BillingService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/saas/billing.service.ts) |
| | Subdomains CMS Themes | **Completed** | [TenantService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/saas/tenant.service.ts) & [CmsService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/saas/cms.service.ts) |
| | Custom Domain DNS lookups | **Completed** | [DomainService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/saas/domain.service.ts) |
| **UI Integrations** | Admin & Vendor Dashboards | **Completed** | [SaaS Platform Admin](file:///f:/CV/E-Commerce%20Platform/frontend/src/app/admin/saas/page.tsx) & [Vendor Dashboard](file:///f:/CV/E-Commerce%20Platform/frontend/src/app/vendor/page.tsx) |
| | Stripe Subscription forms | **Missing** | Backend exists; [profile/page.tsx](file:///f:/CV/E-Commerce%20Platform/frontend/src/app/profile/page.tsx) lacks user subscription components. |
| | Saved Cards lists | **Missing** | Backend exists; [profile/page.tsx](file:///f:/CV/E-Commerce%20Platform/frontend/src/app/profile/page.tsx) lacks saved cards list. |
| | Elements Checkout Integration | **Partial** | Checkout page uses simulated endpoints rather than live Stripe Elements. |

---

## Risks & Limitations

1. **Implicit Tenant Isolation Leakage Risk**:
   * **Detail**: The whitelisted tables cover 12 models. Un-whitelisted models like `Review` or `CartItem` rely on indirect joins for isolation, meaning a direct custom query on these models could return cross-tenant data.
2. **Missing Frontend Interfaces for Payments & Subscriptions**:
   * **Detail**: Consumers cannot view active Stripe subscriptions, cancel plans, or manage saved cards directly on their profile page.
3. **External Dependencies Fallback Simulation**:
   * **Detail**: Stripe payments, Firebase push notifications, and Groq LLM calls degrade gracefully to dry-run mocks if keys are absent. E2E production validation requires registering actual API credentials.

---

## Recommended Next Steps

1. **Complete Profile Forms Integration**:
   Build tabs for payment methods and subscription billing into [profile/page.tsx](file:///f:/CV/E-Commerce%20Platform/frontend/src/app/profile/page.tsx).
2. **Embed Live Stripe Elements Checkout**:
   Refactor [checkout/page.tsx](file:///f:/CV/E-Commerce%20Platform/frontend/src/app/checkout/page.tsx) to mount the Stripe Elements provider and load payment details using Stripe checkout sessions.
3. **Upgrade Tenant Isolation Queries**:
   Expand the models list in [PrismaService](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/prisma/prisma.service.ts) to intercept queries for all models containing client-sensitive data.

---

## Final Assessment

The APEX LUXE platform demonstrates exceptional software engineering practices. The NestJS backend features clean modularity, queue resilience, and robust error validation. The Next.js frontend has built-in localization, PWA capability, and complete admin/vendor dashboard integration. Addressing the profile billing widgets and Stripe Elements checkout elements will transition APEX LUXE from a pre-production candidate into a live-ready enterprise platform.
