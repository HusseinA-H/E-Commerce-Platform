# APEX LUXE — Performance Report

This report documents the performance audits, Core Web Vitals optimizations, caching architectures, and database queries for the APEX LUXE platform.

---

## 1. Frontend Core Web Vitals

The frontend is built on Next.js 15 (React 19) and utilizes static page optimizations where applicable to minimize bundle sizes.

### Core Metrics Target
- **Largest Contentful Paint (LCP)**: Under `1.8s` (achieved by Server-Side Rendering (SSR) catalog pages, lazy loading off-screen components, and utilizing optimized Tailwind classes).
- **Cumulative Layout Shift (CLS)**: Under `0.05` (achieved by wrapping all image containers in defined aspect ratios and using Next.js native `next/image` equivalent SafeImage components).
- **Interaction to Next Paint (INP)**: Under `100ms` (achieved by offloading complex state modifications to lightweight Zustand stores and using React transition hooks for UI updates).

### Bundle Size Analysis
The production build compiles 40/40 routes with:
- **Shared JS Core**: `103 kB`
- **First Load JS**: Averages `11 kB` to `15 kB` per page (highly optimized).

---

## 2. Backend Latency & Caching

The backend NestJS API leverages Redis to cache hot-path catalog reads and prevent database connection pools from exhaustion.

### Redis Caching
- **Product Catalog (`/api/v1/products`)**: Caches list reads for 30 minutes (`1800` seconds). Cache eviction triggers automatically on product inserts, updates, or archives.
- **AI Intelligence Analytics (`/api/v1/saas/analytics/platform`)**: Caches computed analytics dashboard inputs for 24 hours (`86400` seconds), offloading calculation processing to scheduled BullMQ jobs.
- **Fail-Safe Caching**: If Redis encounters connection timeouts, `RedisService` enters a safe bypass mode where it directs query requests straight to SQL Server, preventing service interruptions.

---

## 3. Database Query & Index Performance

By using Microsoft SQL Server with Prisma, we optimize query execution times using index configurations:

1. **Unique Constraints**:
   - `User.email` is uniquely indexed for fast credentials checks.
   - `Tenant.subdomain` is indexed for subdomain tenant identification.
2. **Tenant Discriminator Indexes**:
   - Added `@@index([tenantId])` on the `User`, `Product`, `Order`, `Category`, `WishlistItem`, `Coupon`, `Warehouse`, and `RegionProductPrice` models to isolate database transactions.
3. **Foreign Key Indexes**:
   - Added indexes on `categoryId` and `inventoryStatus` in the `Product` table to speed up catalog queries.
   - Added indexes on `userId` and `status` in the `Order` table.
