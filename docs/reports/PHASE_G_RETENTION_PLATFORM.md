# PHASE G — Retention, Loyalty & Growth Platform
## APEX LUXE Enterprise Commerce Platform

---

## Overview

Phase G transforms APEX LUXE into a complete customer retention and growth engine. It adds 8 new platform capabilities operating on top of the existing notification, mail, cart, and wishlist infrastructure.

---

## G.1 — Wishlist Intelligence

**Backend:** `backend/src/modules/wishlist/`

| File | Description |
|------|-------------|
| `wishlist-intelligence.service.ts` | Restock alerts, price-drop alerts (with threshold), AI product suggestions via Groq |
| `wishlist.scheduler.ts` | Daily 6am cron — runs restock + price-drop scans in parallel |
| `wishlist.controller.ts` | Extended with: `GET /wishlist/alerts`, `POST /wishlist/alerts`, `DELETE /wishlist/alerts/:productId/:alertType`, `GET /wishlist/ai-suggestions` |

**Alert logic:**
- Restock: fires when `product.inventoryStatus === 'IN_STOCK'` and alert has not triggered in 7 days
- Price Drop: fires when `product.price <= alert.priceThreshold` and alert has not triggered in 3 days
- AI Suggestions: Groq receives wishlist summary + candidate products, returns ≤6 compatible product IDs

---

## G.2 — Abandoned Cart Recovery

**Backend:** `backend/src/modules/retention/`

| File | Description |
|------|-------------|
| `abandoned-cart.service.ts` | Scans idle carts (>1hr), deduplicates with `AbandonedCartJob`, enqueues BullMQ jobs |
| `abandoned-cart.processor.ts` | BullMQ worker: Groq generates personalized luxury reminder, sends email + in-app notification |
| `abandoned-cart.scheduler.ts` | Hourly `@Cron` — triggers `scanAbandonedCarts()` |

**Cart abandonment definition:** `CartItem.updatedAt < 1 hour ago` + no order placed since threshold.

**Groq prompt:** Luxury concierge tone, references specific items and cart value. Falls back to static copy if Groq unavailable.

---

## G.3 — Loyalty & Rewards System

**Backend:** `backend/src/modules/loyalty/`

| Endpoint | Description |
|----------|-------------|
| `GET /loyalty` | Account + tier + progress |
| `GET /loyalty/transactions` | Paginated point history |
| `GET /loyalty/rewards` | Catalog with `canAfford` + `tierEligible` flags |
| `POST /loyalty/redeem/:rewardId` | Deduct points, generate coupon code, notify |
| `GET /loyalty/admin/stats` | Tier distribution, points issued, redemptions |

**Tier thresholds (lifetime points):**
| Tier | Threshold |
|------|-----------|
| Bronze | 0+ |
| Silver | 500+ |
| Gold | 2,000+ |
| Platinum | 5,000+ |

**Points earned:**
- 1pt per $1 spent on orders
- 200pts per referral signup
- 500pts when referred user makes first purchase

---

## G.4 — Referral Program

**Backend:** `backend/src/modules/referral/`

| Endpoint | Description |
|----------|-------------|
| `GET /referral/my-code` | Get or create referral code + link |
| `POST /referral/apply` | Apply code post-registration |
| `GET /referral/analytics` | Personal referral performance |
| `GET /referral/admin/stats` | Platform-wide referral stats |

**Referral link format:** `https://apexluxe.com/ref/{8-char code}`

---

## G.5 — Notification Center

**Extended:** `backend/src/modules/notifications/`

Added endpoints:
- `GET /notifications/unread-count` — returns `{ count: number }` for badge
- `DELETE /notifications/:id` — soft delete a notification

**Frontend:** Notification bell in Navbar with:
- Live 30s polling for unread count
- Dropdown panel with last 8 notifications
- Per-notification mark-as-read on click
- "Mark all read" button
- Color + emoji per notification type

---

## G.6 — Email Automation

**Extended:** `backend/src/modules/mail/mail.service.ts`

| Method | Subject |
|--------|---------|
| `sendWelcomeEmail` | Welcome to APEX LUXE |
| `sendOrderConfirmation` | Order Confirmed #XXXXXXXX |
| `sendShippingUpdate` | Your Order Has Shipped |
| `sendDeliveredEmail` | Your Order Has Been Delivered |
| `sendAbandonedCartEmail` | Your Cart Is Waiting (AI-personalized body) |
| `sendWishlistRestockEmail` | [Product] Is Back In Stock |
| `sendPriceDropEmail` | Price Drop: [Product] |

All templates use the shared APEX LUXE dark email layout with `#d4ff3f` accent, inline CSS, fully SMTP-ready.

---

## G.7 — Customer 360 Profile

**Frontend:** `/loyalty/page.tsx`

4-tab interface:
1. **Overview** — Tier badge, progress bar, tier levels, earn actions
2. **Rewards** — Reward grid with affordability + tier eligibility, redemption flow with coupon code display
3. **History** — Paginated point transaction log with +/− coloring
4. **Referral** — Code display, copy-link button, stats (total referrals, converted, points earned), how-it-works guide

**Profile page integration:** Loyalty tier card with progress bar in left column, links to `/loyalty`.

---

## G.8 — AI Growth Intelligence

**Backend:** `backend/src/modules/retention/growth-intelligence.service.ts`

| Endpoint | Description |
|----------|-------------|
| `GET /growth/intelligence/:userId` | AI churn risk, CLV, re-engagement, promo (admin only) |
| `GET /growth/retention-analytics` | Platform cohort retention stats (admin only) |
| `GET /growth/scan-abandoned-carts` | Manual trigger for cart scan (admin only) |

**Signals used for Groq analysis:**
- Days since last order
- Total lifetime spend
- Order count + AOV
- Account tenure (months)
- Wishlist size
- Cart items count
- Loyalty tier

**Output (Redis-cached 24h):**
- `churnRiskScore` (0–100)
- `churnRiskLabel` (Low/Medium/High/Critical)
- `estimatedCLV` (USD)
- `reEngagementSuggestions` (3 actions)
- `personalizedPromo` (2-sentence luxury copy)

---

## Admin Dashboard

**Route:** `/admin/retention`

3-tab dashboard:
1. **Retention** — Active customers, retention rate, top spenders, CLV
2. **Loyalty Program** — Tier distribution bar chart, points issued, redemption count
3. **Referral Program** — Total codes, conversion rate, top referrers table

---

## Database Models Added (8)

| Model | Purpose |
|-------|---------|
| `LoyaltyAccount` | Points balance + tier per user |
| `LoyaltyTransaction` | Immutable points ledger |
| `LoyaltyReward` | Reward catalog |
| `LoyaltyRedemption` | Redemption records with coupon codes |
| `ReferralCode` | Unique per-user codes |
| `ReferralEvent` | Referrer → Referred relationships |
| `AbandonedCartJob` | Cart recovery state tracking |
| `WishlistAlert` | Per-product restock/price alert settings |

---

## Build Status

| Layer | Status |
|-------|--------|
| `prisma db push` | ✅ Synced |
| `prisma generate` | ✅ Regenerated |
| Backend `npm run build` | ✅ 0 errors |
| Frontend `npm run build` | ✅ 0 errors |
