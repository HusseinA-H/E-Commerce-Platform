# Local Development Setup Guide

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 18.x | Backend & Frontend runtime |
| npm | ≥ 9.x | Package manager |
| Docker Desktop | ≥ 4.x | Local infrastructure (SQL Server, Redis) |
| Git | Any | Source control |

---

## 1. Clone & Install Dependencies

```powershell
# Install backend dependencies
cd "f:\CV\E-Commerce Platform\backend"
npm install

# Install frontend dependencies
cd "f:\CV\E-Commerce Platform\frontend"
npm install
```

---

## 2. Configure Environment Variables

Copy the example env file and fill in required values:

```powershell
cd "f:\CV\E-Commerce Platform\backend"
copy .env.example .env   # Edit .env with your actual values
```

**Minimum required values for local development:**

```env
# Application
PORT=5000
NODE_ENV=development

# Database (matches docker-compose defaults)
DATABASE_URL=sqlserver://localhost:1433;database=ApexLuxeDB;user=sa;password=ApexLuxe@2024!;trustServerCertificate=true

# Redis (matches docker-compose defaults)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=          # Leave blank if not using Redis auth locally

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_REFRESH_EXPIRES_IN=7d

# Stripe (optional for development — payments will gracefully degrade)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 3. Start Local Infrastructure (Docker)

```powershell
# From the project root
cd "f:\CV\E-Commerce Platform"

# Start SQL Server + Redis in the background
docker compose up -d

# Check containers are healthy
docker compose ps
```

> **First boot note:** SQL Server takes ~30 seconds to initialize on first run. The backend's retry logic will handle this automatically.

### Verify services are running

```powershell
# Test Redis
docker exec apex_luxe_redis redis-cli ping
# Expected: PONG

# Test SQL Server
docker exec apex_luxe_mssql /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "ApexLuxe@2024!" -Q "SELECT @@VERSION"
```

---

## 4. Run Database Migrations

```powershell
cd "f:\CV\E-Commerce Platform\backend"

# Apply all pending Prisma migrations
npx prisma migrate deploy

# (Optional) Open Prisma Studio to browse the database
npx prisma studio
```

---

## 5. Start Development Servers

**Backend** (NestJS on port 5000):
```powershell
cd "f:\CV\E-Commerce Platform\backend"
npm run start:dev
```

**Frontend** (Next.js on port 3000):
```powershell
cd "f:\CV\E-Commerce Platform\frontend"
npm run dev
```

---

## 6. Verify Everything is Working

| URL | Expected |
|-----|----------|
| `http://localhost:5000/api/docs` | Swagger UI |
| `http://localhost:5000/api/v1/products` | Product list JSON |
| `http://localhost:3000` | APEX LUXE storefront |

---

## 7. Stop Infrastructure

```powershell
# Stop containers (data preserved)
docker compose down

# Stop containers AND delete all data (full reset)
docker compose down -v
```

---

## Development-Safe Mode

The backend is designed to start even when infrastructure is unavailable. If SQL Server or Redis is offline:

- **Database offline**: Backend starts in **Degraded Mode**. DB-dependent endpoints return `503 Service Unavailable` until the database comes online and reconnects.
- **Redis offline**: Caching is automatically disabled. All cache operations become no-ops. BullMQ queues pause until Redis reconnects.
- **Neither**: The backend still starts and serves health-check endpoints.

This allows frontend development without running all infrastructure services simultaneously.
