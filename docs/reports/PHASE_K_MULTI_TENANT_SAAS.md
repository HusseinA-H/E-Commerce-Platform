# Phase K: Multi-Tenant SaaS Platform

This phase implements a fully functional, enterprise-grade Multi-Tenant SaaS Platform for the APEX LUXE retail ecosystem, enabling brands to deploy, customize, and operate their own retail storefronts under isolated environments.

---

## 1. System Architecture

The SaaS layer uses a **Shared Database, Shared Schema with Discriminator Column (`tenantId`)** architecture for scalability and ease of updates.

```
                    ┌───────────────────────────────┐
                    │      Root / Custom Host       │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │    Next.js Page Middleware    │
                    │   (Host header resolution)    │
                    └───────────────┬───────────────┘
                                    │
                         x-tenant-id│(Subdomain / Cookie)
                                    ▼
                    ┌───────────────────────────────┐
                    │   Axios Client Interceptor    │
                    │   (Automatic Header Injection)│
                    └───────────────┬───────────────┘
                                    │
                         X-Tenant-Id│(HTTP Header)
                                    ▼
                    ┌───────────────────────────────┐
                    │     NestJS API Middleware     │
                    │  (Context: AsyncLocalStorage) │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   Prisma Client Extension     │
                    │ (Auto tenant filter injection)│
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │       SQL Server DB           │
                    │   (Rows isolated by Tenant)   │
                    └───────────────────────────────┘
```

---

## 2. Core Modules & Services

### Tenant Isolation & Security
- **Prisma Client Extension**: In [prisma.service.ts](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/prisma/prisma.service.ts), a global query middleware intercepts all database reads/writes. If a request is running within a tenant context, it automatically injects `where: { tenantId }` filters on scoped models.
- **Request Context**: Implemented using Node's `AsyncLocalStorage` in [tenant-context.ts](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/saas/tenant-context.ts), bound via a global HTTP middleware [tenant.middleware.ts](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/saas/tenant.middleware.ts).

### SaaS Billing & Plan Quotas
- **Billing Service**: Located in [billing.service.ts](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/saas/billing.service.ts). Coordinates plan quotas, Stripe subscriptions, checkout sessions, and portal redirection.
- **Plans & Limits**:
  - **Starter** ($49/mo): Max 100 products, 1 warehouse, 0 custom domains.
  - **Growth** ($149/mo): Max 500 products, 2 warehouses, custom domain.
  - **Pro** ($499/mo): Max 2000 products, 5 warehouses, custom CSS overrides, full AI suite.
  - **Enterprise** ($1999/mo): Unlimited quotas, custom SLA.
- **Failsafe billing**: Automatically provisions mock subscriptions locally if Stripe credentials are unconfigured in `.env`, allowing full testing without external API requirements.

### Store Builder & Theme Engine
- **Tenant Settings**: Custom background/highlight/text HEX values, branding logo, theme selection, and CSS overrides are stored in `TenantSettings`.
- **Theme Variables**: Injected dynamically in Next.js server layout [layout.tsx](file:///f:/CV/E-Commerce%20Platform/frontend/src/app/layout.tsx), binding CSS styling parameters directly during server rendering.

### Storefront CMS & SaaS Analytics
- **CMS Service**: Custom hero sliders, blog posts, pages, and category drops are managed on a per-tenant basis in [cms.service.ts](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/saas/cms.service.ts).
- **SaaS Analytics**: Computes Monthly Recurring Revenue (MRR), Annual Recurring Revenue (ARR), plan spread cohorts, and active subscribers in [saas-analytics.service.ts](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/saas/saas-analytics.service.ts).

---

## 3. API Endpoints

The endpoints are exposed in [saas.controller.ts](file:///f:/CV/E-Commerce%20Platform/backend/src/modules/saas/saas.controller.ts):

| Method | Route | Scope | Description |
|---|---|---|---|
| `POST` | `/saas/tenant` | Global | Store Builder: Provision a new Tenant store and default options. |
| `GET` | `/saas/tenant/details` | Tenant | Fetches active settings, custom domain mapping, and theme variables. |
| `PUT` | `/saas/tenant/settings` | Tenant | Updates primary/secondary branding colors, logo, and custom CSS. |
| `PUT` | `/saas/tenant/domain` | Tenant | Connects a custom domain, executing DNS CNAME check beforehand. |
| `GET` | `/saas/billing/subscription`| Tenant | Returns active plan details, product quotas, and warehouse limits. |
| `POST` | `/saas/billing/checkout` | Tenant | Creates a Stripe checkout portal link to upgrade subscriptions. |
| `POST` | `/saas/billing/portal` | Tenant | Creates a Stripe billing management session. |
| `POST` | `/saas/billing/webhook` | Global | Stripe subscription webhook handler (Completed/Updated/Deleted). |
| `GET` | `/saas/cms` | Tenant | Fetches custom storefront CMS collections, banners, and blogs. |
| `PUT` | `/saas/cms` | Tenant | Updates CMS layouts. |
| `GET` | `/saas/analytics/platform` | Super Admin| Compiles global SaaS stats (MRR, ARR, active subscribers, AI telemetry). |
| `GET` | `/saas/tenants` | Super Admin| Lists all stores. |
| `PUT` | `/saas/tenant/:id/status` | Super Admin| Toggles store operational status (Active vs Suspended). |

---

## 4. Frontend Routing (Next.js)

- **Subdomain Routing**: Managed in [middleware.ts](file:///f:/CV/E-Commerce%20Platform/frontend/src/middleware.ts), dynamically parsing subdomain slugs (e.g., `brand1.localhost` -> `brand1`) and writing to client cookies.
- **Client Interceptors**: Handled in Axios client configuration [api-client.ts](file:///f:/CV/E-Commerce%20Platform/frontend/src/lib/api-client.ts), intercepting window hostnames and appending `X-Tenant-Id` header to backend requests.
- **SaaS Platform vs Storefront Toggling**: Executed in [page.tsx](file:///f:/CV/E-Commerce%20Platform/frontend/src/app/page.tsx). Serves the Storefront Builder and pricing plans on the root domain, and the themed brand storefront on active subdomains.
- **SaaS Super-Admin Dashboard**: Visualizes global platform stats, telemetry, and store controls at [/admin/saas](file:///f:/CV/E-Commerce%20Platform/frontend/src/app/admin/saas/page.tsx).
- **Tenant settings panels**: Grouped in tabs at [/admin/settings](file:///f:/CV/E-Commerce%20Platform/frontend/src/app/admin/settings/page.tsx).
