# APEX LUXE Admin Platform Architecture

This document details the multi-role RBAC security layers, auto-promotion bootstrap mechanics, audit trails interceptors, and administrative routing configurations.

---

## 1. Authentication & Multi-Role RBAC Model

The administrative platform utilizes a hierarchal Role-Based Access Control (RBAC) mechanism. The roles are defined as:

1. **`super_admin`**: Full bypass authority. Possesses privileges to delete any profile and update administrative role assignments.
2. **`admin`**: Full control over products, orders, coupons, and view audit logs. Cannot modify role parameters of other admins.
3. **`inventory_manager`**: Restrictive control to update product schemas, adjust stock levels, catalog configurations, and toggle featured states.
4. **`support_agent`**: Restrictive control to review orders log, append carrier tracking data, process cancellations, and initiate Stripe transaction refunds.
5. **`customer`**: Standard storefront account. Restrictively barred from accessing administrative routes.

### Guards Enforcements
- **`JwtAuthGuard`**: Restricts endpoints to authenticated users holding a valid JWT session token.
- **`RolesGuard`**: Reads metadata decorators (`@Roles(...)`) to restrict endpoint execution. The guard verifies the user's role against configured permission scopes using hierarchy validations.

---

## 2. Admin Auto-Promotion on Bootstrap

To facilitate seamless local installation and container orchestration, the backend implements an automatic promo script during bootstrap:

- On startup (`OnApplicationBootstrap`), `AuthService` retrieves `ADMIN_EMAIL` from the configured environment variables.
- If present, it checks if a corresponding user profile exists in the database.
- If found, it automatically promotions the profile's role parameter to `super_admin`.

---

## 3. Auditable Interceptor Operations

System security requires archiving all administrative mutations. A global interceptor (`AuditInterceptor`) captures:

- **Entity Targets**: `Product`, `Order`, `Coupon`, `Refund`.
- **Logged Actions**: Create, Edit, Delete, Restore, Cancel, Refund.
- **Operator Attribution**: Stamped with the authenticated user ID and email of the administrator invoking the request.
- **Audit Details**: Deep changes serialized as JSON strings in the database.
