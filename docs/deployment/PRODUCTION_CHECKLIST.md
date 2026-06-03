# APEX LUXE — Production Release Checklist

Use this checklist to ensure all security, database, integration, and operational settings are correctly configured before making the APEX LUXE platform live.

---

## 1. Domain & Routing Infrastructure
- [ ] **DNS Mappings**: Bind root domain (`apexluxe.com`) and wildcard CNAME record (`*.apexluxe.com`) to the production load balancer/VPS IP.
- [ ] **SSL Certification**: Ensure Traefik ACME/Let's Encrypt certificates resolve cleanly over port 443.
- [ ] **Subdomain Middleware**: Verify that Next.js middleware correctly parses subdomains on the production host header.

---

## 2. Security & Token Settings
- [ ] **Secrets Rotation**: Rotate all default tokens (specifically `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `SESSION_SECRET`). Use secure generated 32-character strings.
- [ ] **HTTPS Redirection**: Ensure the load balancer redirects all HTTP traffic to HTTPS automatically.
- [ ] **Cookie Enforcements**: Confirm that `NODE_ENV` is set to `production` so that session and auth cookies use the secure `__Host-` prefix and have `secure: true`.
- [ ] **CORS Settings**: Restrict the NestJS API `allowedOrigins` list strictly to the production frontend domain (e.g. `https://apexluxe.com`).

---

## 3. Database & Caching Tiers
- [ ] **SQL Server Passwords**: Ensure the `MSSQL_SA_PASSWORD` is updated to a strong, production-grade password.
- [ ] **Database Schema**: Apply all Prisma migrations:
  ```bash
  npx prisma migrate deploy
  ```
- [ ] **Index Verification**: Ensure indexes exist for `tenantId` across all models.
- [ ] **Redis Connection**: Confirm that Redis requires password authentication (`--requirepass`) in production.

---

## 4. Live Integrations Keys
- [ ] **Stripe Live mode**: Replace all `sk_test_...` credentials with live `sk_live_...` production credentials in backend `.env`.
- [ ] **Stripe Webhook Registration**: Configure the production webhook endpoint (`https://api.apexluxe.com/api/v1/payments/webhook`) in the Stripe Dashboard, subscribe to required events, and update `STRIPE_WEBHOOK_SECRET` in `.env`.
- [ ] **Cloudinary Production Cloud**: Provision a production-isolated Cloudinary environment and update cloud name/API keys.
- [ ] **Email Dispatch Service**: Set up SMTP credentials (or Resend API tokens) for transactional billing and auth emails.
