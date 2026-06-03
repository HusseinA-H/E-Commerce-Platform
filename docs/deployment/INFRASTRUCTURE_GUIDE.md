# Infrastructure Guide

## Overview

APEX LUXE relies on two infrastructure services:

| Service | Role | Local Port | Container Name |
|---------|------|------------|----------------|
| **SQL Server 2022** | Primary relational database (Prisma ORM) | 1433 | `apex_luxe_mssql` |
| **Redis 7** | Cache layer + BullMQ job queue broker | 6379 | `apex_luxe_redis` |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  APEX LUXE Backend                  │
│                   (NestJS :5000)                    │
│                                                     │
│  ┌─────────────────┐   ┌──────────────────────────┐ │
│  │  PrismaService  │   │     RedisService         │ │
│  │  (with retry)   │   │  (lazyConnect, fallback) │ │
│  └────────┬────────┘   └──────────┬───────────────┘ │
│           │                       │                 │
│           │            ┌──────────┴──────────┐      │
│           │            │    BullMQ Workers    │      │
│           │            │  (WebhooksProcessor) │      │
│           │            └─────────────────────┘      │
└───────────┼───────────────────────┼────────────────┘
            │                       │
    ┌───────▼──────┐      ┌─────────▼──────┐
    │  SQL Server  │      │    Redis 7      │
    │    :1433     │      │    :6379        │
    │  (Prisma)    │      │  (Cache+Queue)  │
    └──────────────┘      └────────────────┘
```

---

## Environment Variables Reference

### Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ Yes | — | Full SQL Server connection string |

**Connection string format:**
```
sqlserver://HOST:1433;database=DB_NAME;user=USERNAME;password=PASSWORD;trustServerCertificate=true
```

### Redis

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_HOST` | ✅ Yes | `localhost` | Redis hostname |
| `REDIS_PORT` | ✅ Yes | `6379` | Redis port |
| `REDIS_PASSWORD` | ⚠️ Optional | — | Redis AUTH password (required in prod) |

### Application

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | ✅ Yes | `5000` | HTTP server port |
| `NODE_ENV` | ⚠️ Optional | `development` | `development` / `production` |
| `SESSION_SECRET` | ⚠️ Optional | fallback value | Express session secret |
| `FRONTEND_URL` | ⚠️ Optional | `http://localhost:3000` | CORS allowed origin |

### JWT Authentication

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | ✅ Yes | Access token signing secret (≥32 chars) |
| `JWT_EXPIRES_IN` | ✅ Yes | Access token TTL (e.g., `15m`) |
| `JWT_REFRESH_SECRET` | ✅ Yes | Refresh token signing secret (≥32 chars) |
| `JWT_REFRESH_EXPIRES_IN` | ✅ Yes | Refresh token TTL (e.g., `7d`) |

### Stripe

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | ⚠️ Optional | Stripe API key (`sk_test_...` for dev) |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ Optional | Stripe webhook signing secret |

### OAuth Providers

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | ⚠️ Optional | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ⚠️ Optional | Google OAuth client secret |
| `MICROSOFT_CLIENT_ID` | ⚠️ Optional | Microsoft OAuth client ID |
| `MICROSOFT_CLIENT_SECRET` | ⚠️ Optional | Microsoft OAuth client secret |
| `GITHUB_CLIENT_ID` | ⚠️ Optional | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | ⚠️ Optional | GitHub OAuth client secret |

---

## Resilience Behaviour

### PrismaService (SQL Server)

| State | Behaviour |
|-------|-----------|
| Connected | Normal operation |
| Connecting (retry 1–5) | Exponential backoff: 2s → 4s → 8s → 16s → 30s |
| All retries exhausted | Starts in **Degraded Mode** — logs `CRITICAL`, does NOT crash |
| Degraded Mode | DB-dependent endpoints return 503; health endpoint still responds |

### RedisService

| State | Behaviour |
|-------|-----------|
| Connected | Full caching + BullMQ queue processing |
| Disconnected | All cache ops become silent no-ops (`get` returns `null`, `set` skips) |
| Reconnecting | Automatic retry with exponential backoff (max 3 attempts) |

### BullMQ Workers

- `lazyConnect: true` — BullMQ does not connect to Redis eagerly on module init
- `enableOfflineQueue: false` — Job queue calls fail immediately if Redis is down (no buffering)
- Workers will resume processing automatically once Redis becomes available

---

## Docker Volumes

Data is persisted in named Docker volumes:

| Volume | Path inside container | Purpose |
|--------|-----------------------|---------|
| `apex_luxe_mssql_data` | `/var/opt/mssql` | SQL Server database files |
| `apex_luxe_redis_data` | `/data` | Redis AOF + RDB snapshots |

> Volumes survive `docker compose down` but are deleted by `docker compose down -v`.

---

## Production Differences

| Setting | Development | Production |
|---------|-------------|------------|
| `NODE_ENV` | `development` | `production` |
| CSRF enforcement | Disabled | Strict origin/referer checking |
| Unhandled rejections | Warn + continue | Exit process immediately |
| Helmet CSP | Relaxed | Strict |
| Redis auth | Optional | **Required** |
| Stripe keys | `sk_test_*` | `sk_live_*` |
