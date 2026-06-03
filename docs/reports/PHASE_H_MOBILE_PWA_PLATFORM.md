# PHASE H — Mobile, PWA & Omnichannel Commerce
## APEX LUXE Enterprise Commerce Platform

---

## Overview

Phase H transforms the APEX LUXE web experience into a mobile-native Progressive Web App (PWA) with push notifications, QR code commerce integrations, omnichannel delivery control, and performance logging.

---

## Technical Implementations

### 1. Progressive Web App (PWA) Setup
- **Package**: `@ducanh2912/next-pwa` integrated into `next.config.ts`.
- **Assets**: 512px and 192px app icons and maskable icon variants loaded in `public/icons/`.
- **Manifest**: `manifest.json` configured with dark branding theme (#0b0b0b), orientation lock, and quick action shortcuts (Shop, Loyalty, Cart).
- **Service Worker**: Workbox-managed caching with fallback document routing to custom APEX offline page `offline.html`.

### 2. Firebase Cloud Messaging (FCM) & Push Notifications
- **Backend Service**: `PushService` initializes the `firebase-admin` SDK with dry-run safe fallbacks to console logging if credentials aren't set.
- **Device Registration**:
  - `POST /api/notifications/push/register` registers FCM tokens mapping to users.
  - `POST /api/notifications/push/unregister` removes tokens.
- **Multicast Dispatch**: Multicast message broadcasting to active device tokens with automated dead/expired token pruning.

### 3. Omnichannel Delivery Preferences
- **Matrix Configuration**:
  - Channels: `in_app` | `email` | `push`
  - Topics: `order_updates` | `wishlist_alerts` | `loyalty_alerts` | `promotions` | `ai_recommendations`
- **Database Tables**: `NotificationPreference` and `UserDeviceToken`.
- **Endpoints**:
  - `GET /api/notifications/preferences`
  - `PUT /api/notifications/preferences`
- **Dynamic Delivery**: `NotificationsService.trigger()` checks user channel preferences on every trigger, routing notifications to active delivery workers (SMTP via Nodemailer, Web Socket, and FCM).

### 4. QR Commerce
- **Endpoints**:
  - `GET /api/qr/product/:id` -> Generates product page QR.
  - `GET /api/qr/referral/:code` -> Generates referral registration link QR.
  - `GET /api/qr/order/:id` -> Generates order tracking QR.
- **Return Type**: PNG buffer with `Content-Type: image/png` to facilitate direct rendering inside HTML `<img>` source attributes.

### 5. Mobile Analytics & Retention Metrics
- **Model**: `MobileAnalyticsEvent` tracks client actions.
- **Event Logging**: `POST /api/mobile-analytics/event` records PWA installs, push permissions, and checkout conversions.
- **Aggregations**: `GET /api/mobile-analytics/metrics` returns system breakdown.

### 6. Social Commerce Integration Feeds
- **Meta Catalog**: `GET /api/social/catalog/meta` serves XML RSS feeds compliant with Facebook and Instagram Commerce Manager catalogs.
- **TikTok Catalog**: `GET /api/social/catalog/tiktok` serves structured JSON catalog payloads.

---

## Verification & Build Status

Build runs verify that the application compiles cleanly.

- **Backend compilation status**: `success` (0 errors)
- **Frontend compilation status**: `success` (0 errors)
