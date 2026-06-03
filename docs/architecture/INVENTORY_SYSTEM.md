# APEX LUXE Inventory Reservation & Automation

This document outlines the transactional checkout stock reservations, automatic low stock system warnings, and the asynchronous cleanup sweepers.

---

## 1. Checkout Stock Reservation Flow

To prevent double-sales and overselling during periods of high-volume concurrent purchases, the catalog implements a **stock reservation phase** before final payment:

1. **Reservation Phase**:
   - When a user initializes checkout, the backend checks for active stock.
   - Active stock is calculated as: `available = stockQuantity - reservedStock`.
   - If `available >= requestedQuantity`, the backend locks the request and increments `reservedStock` by the checkout quantity.
   - This holds the stock for a maximum of 30 minutes while the payment is processed via Stripe.

2. **Commit Phase (Payment Success)**:
   - On Stripe webhook confirmation (`payment_intent.succeeded`), the reservation is committed.
   - `reservedStock` is decremented by the purchased quantity.
   - `stockQuantity` is decremented by the purchased quantity, and the legacy `stock` column is synced for backwards compatibility.

3. **Release Phase (Payment Failure or Expiry)**:
   - If payment fails, or if 30 minutes expire without checkout completion, the reservation is cancelled.
   - `reservedStock` is decremented, and the stock is returned back to the active catalog immediately.

---

## 2. Race Conditions & Serializable Locks

Database queries during stock check and increment are wrapped in a **Prisma transaction lock** using the `Serializable` isolation level. This forces transactions to process sequentially on contested product rows, preventing double-sell race conditions.

---

## 3. Stock State Automation

Changes in `stockQuantity` automatically transition `inventoryStatus` across three states:
- **`IN_STOCK`**: Active stock is greater than `lowStockThreshold` (default 5).
- **`LOW_STOCK`**: Active stock is greater than 0 but less than or equal to `lowStockThreshold`.
- **`OUT_OF_STOCK`**: Active stock is exactly 0.

### Administrative Alerts
Upon hitting `LOW_STOCK` or `OUT_OF_STOCK`:
- A database `Notification` of type `LOW_STOCK` is dispatched to the Admin Control Hub.
- An alert email is dispatched via `MailService` to the configured `ADMIN_EMAIL` address.
