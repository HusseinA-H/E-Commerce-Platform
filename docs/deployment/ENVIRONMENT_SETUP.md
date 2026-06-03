# APEX LUXE — Environment Setup Guide

This document describes all the environment variables required to run the APEX LUXE platform locally and in production. 

> [!IMPORTANT]
> Never commit real values of these environment variables to the repository. Use this guide to create local `.env` files.

---

## 1. Backend Environment Variables (`backend/.env`)

Create a `.env` file in the `backend/` directory using the following schema.

### Core Application
* `PORT`: The port number on which the NestJS backend runs (default: `5000`).

### Database Configuration (SQL Server)
* `DATABASE_URL`: Connection string for SQL Server.
  * *Format*: `"sqlserver://<host>:<port>;database=<db-name>;user=<username>;password=<password>;encrypt=true;trustServerCertificate=true"`

### JWT Token Infrastructure
* `JWT_SECRET`: Secure string used to sign Access Tokens.
* `JWT_EXPIRES_IN`: Expiration window for Access Tokens (e.g., `"900s"`).
* `JWT_REFRESH_SECRET`: Secure string used to sign Refresh Tokens.
* `JWT_REFRESH_EXPIRES_IN`: Expiration window for Refresh Tokens (e.g., `"7d"`).

### Redis Cache & Queue Infrastructure
* `REDIS_HOST`: Host address of the Redis instance (e.g., `"localhost"`).
* `REDIS_PORT`: Port number of the Redis instance (default: `6379`).
* `REDIS_PASSWORD`: Password credentials for Redis connection.

### Stripe Payment Infrastructure
* `STRIPE_SECRET_KEY`: Private API secret key from Stripe dashboard.
* `STRIPE_PUBLISHABLE_KEY`: Public publishable key from Stripe dashboard.
* `STRIPE_WEBHOOK_SECRET`: Webhook secret used to cryptographically verify webhook signatures.

### Email Delivery Infrastructure (Resend)
* `RESEND_API_KEY`: API key for email delivery through Resend.
* `RESEND_FROM_EMAIL`: Authorized sender domain address.

### Groq AI Inference
* `GROQ_API_KEY`: API key for accessing LLM models (e.g., Llama 3) via the Groq SDK.

### Cloudinary Asset CDN
* `CLOUDINARY_CLOUD_NAME`: Cloud name for uploading images.
* `CLOUDINARY_API_KEY`: API key credential for Cloudinary.
* `CLOUDINARY_API_SECRET`: Secret API credential for Cloudinary.

### Security Rate Limiting
* `THROTTLER_TTL`: Time-to-live window for request rate limiting (default: `60` seconds).
* `THROTTLER_LIMIT`: Maximum requests allowed within TTL window (default: `1000`).

### OAuth Social Credentials
* **Google**:
  * `GOOGLE_CLIENT_ID`: OAuth 2.0 Client ID from Google Cloud Console.
  * `GOOGLE_CLIENT_SECRET`: OAuth 2.0 Client Secret from Google Cloud Console.
* **Microsoft**:
  * `MICROSOFT_CLIENT_ID`: Azure AD App Registration Application (client) ID.
  * `MICROSOFT_CLIENT_SECRET`: Azure AD App Registration Client Secret.
  * `MICROSOFT_TENANT_ID`: Azure AD Tenant ID (or `"common"` for multi-tenant login).
* **GitHub**:
  * `GITHUB_CLIENT_ID`: GitHub OAuth App Client ID.
  * `GITHUB_CLIENT_SECRET`: GitHub OAuth App Client Secret.

### Admin Platform Seed Settings
* `ADMIN_EMAIL`: Seed credentials for Root Admin login (e.g., `"admin@apexluxe.com"`).
* `ADMIN_PASSWORD`: Secure initial password for Root Admin.
* `ADMIN_NAME`: Display name for Root Admin.
* `FORCE_ADMIN_PASSWORD_RESET`: Trigger password resets on initial login (`"true"` | `"false"`).

---

## 2. Frontend Environment Variables (`frontend/.env.local`)

Create a `.env.local` file in the `frontend/` directory.

* `NEXT_PUBLIC_API_URL`: Root endpoint URL of the NestJS backend (e.g., `http://localhost:5000`).
* `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Optional fallback publishable key for Stripe Elements. (Note: The checkout page fetches this dynamically from the backend by default, but it can be provided here for absolute coverage).

---

## 3. Template Configuration

### Backend Template (`backend/.env.example`)

```env
# App Configuration
PORT=5000

# Database (SQL Server)
DATABASE_URL="sqlserver://localhost:1433;database=apexluxe;user=SA;password=YourSecurePassword!;encrypt=true;trustServerCertificate=true"

# JWT Config
JWT_SECRET=your_jwt_access_secret_key_here_high_entropy
JWT_EXPIRES_IN="900s"
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here_high_entropy
JWT_REFRESH_EXPIRES_IN="7d"

# Redis Config
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD="your_redis_password_here"

# Stripe SDK Integration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend Mail Server
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=your-sender-domain.com

# Groq LLM API
GROQ_API_KEY=gsk_...

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Rate Limiting
THROTTLER_TTL=60
THROTTLER_LIMIT=1000

# Social Sign-In Credentials
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_TENANT_ID=common
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Root Admin Seed Credentials
ADMIN_EMAIL="admin@apexluxe.com"
ADMIN_PASSWORD="StrongPassword123!"
ADMIN_NAME="Root Admin"
FORCE_ADMIN_PASSWORD_RESET="false"
```

### Frontend Template (`frontend/.env.local.example`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```
