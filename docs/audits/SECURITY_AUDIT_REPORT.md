# APEX LUXE — Security Audit Report

This report documents the security posture, vulnerability analysis, and mitigation controls implemented across the APEX LUXE multi-tenant e-commerce ecosystem.

---

## 1. Authentication & Session Security

- **JWT Token Structure**: Implemented separate Access and Refresh tokens. Access tokens hold short lifetimes (`900s` / 15 minutes), and Refresh tokens expire in `7d`.
- **Token Rotation**: Token rotation is active in `AuthService.refresh()`. Every refresh request revokes the previous refresh token and issues a new pair, preventing replay attacks.
- **Cookie Settings**: Access tokens are stored in `HttpOnly`, `SameSite: Lax` cookies. In production environments, they are prefixed with `__Host-` to enforce secure transit over HTTPS and restrict cookie scoping to domain boundaries.

---

## 2. Multi-Tenant Data Isolation

- **Isolation Strategy**: Shared Database, Shared Schema with Discriminator Column (`tenantId`).
- **Prisma Client Hook Interception**: Multi-tenant security is enforced at the database driver layer in `PrismaService` via a JavaScript `Proxy`. It intercepts all database queries (`findMany`, `findFirst`, `update`, `delete`, etc.). If a `tenantId` is set in the `AsyncLocalStorage` context, the query is modified to include `where: { tenantId }`.
- **Leakage Audit**:
  - We verified that all tenant-scoped tables (`User`, `Product`, `Order`, `Category`, `WishlistItem`, `Coupon`, `Warehouse`, `RegionProductPrice`) are registered in `PrismaService`'s `modelsWithTenantId` array.
  - Custom raw queries must be avoided, or explicitly pass `tenantId` parameters. All current catalog and checkouts use Prisma ORM methods, guaranteeing that filters are injected programmatically.

---

## 3. OWASP Top 10 Mitigations

### A. Broken Access Control (A01:2021)
- Protected endpoints use the `JwtAuthGuard` to verify user signatures.
- Administrative routes additionally utilize the `RolesGuard` or `AdminGuard` verifying matching role groups (`super_admin`, `admin`, `inventory_manager`, `support_agent`).

### B. Cryptographic Failures (A02:2021)
- User passwords are encrypted using `bcrypt` with a work factor of 10. No plain-text passwords touch the SQL Server database.
- Webhooks verify cryptographic payload signatures using raw byte buffers constructed through the official Stripe SDK, preventing spoofing.

### C. Injection (A03:2021)
- **SQL Injection**: Prisma ORM utilizes query parameterization for all generated statements, preventing SQL injection exploits.
- **XSS (Cross-Site Scripting)**: Enforced a global `SanitizePipe` utilizing the `xss` library in NestJS `main.ts` to sanitize all incoming request payload strings.

### D. Insecure Design (A04:2021)
- Implemented strict DTO payload checking using `class-validator` and `ValidationPipe` with options:
  - `transform: true`
  - `whitelist: true` (automatically strip fields that do not have active validation decorators)
  - `forbidNonWhitelisted: true` (fail requests that attempt parameter injection)

### E. Vulnerable and Outdated Components (A06:2021)
- Package dependencies are actively managed. The backend and frontend compile with zero warnings on clean modern Node.js versions.

### F. Identification and Authentication Failures (A07:2021)
- In the `forgotPassword` flow, the server returns a generic success statement regardless of whether the email exists, preventing user enumeration attacks.

### G. Software and Data Integrity Failures (A08:2021)
- **Unvalidated Uploads**: We added strict validation to the upload endpoints in `products.controller.ts` and `ai-stylist.controller.ts`. Both controllers validate file sizes and MIME types (using `ParseFilePipe`, `MaxFileSizeValidator`, and `FileTypeValidator`) to prevent malicious executable files from being uploaded.

---

## 4. CSRF & SSRF Mitigations

- **CSRF (Cross-Site Request Forgery)**: Implemented strict Origin and Referer validation middleware in `main.ts` for all mutating requests (POST, PUT, PATCH, DELETE) to ensure requests originate exclusively from the approved `FRONTEND_URL`.
- **SSRF (Server-Side Request Forgery)**: Checked all API endpoints for SSRF vectors. In `VisualSearchService`, the Vision provider (`Groq`) is called with the image URL directly. The URL is stored but not downloaded by our backend server, transferring the HTTP retrieval to the API vendor.
