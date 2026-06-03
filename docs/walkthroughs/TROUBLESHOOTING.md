# Troubleshooting Guide

## Quick Diagnostics

Run these first to identify the problem:

```powershell
# Check if Docker containers are running
docker compose ps

# Check container logs
docker compose logs mssql
docker compose logs redis

# Check if ports are listening
netstat -an | findstr "1433"
netstat -an | findstr "6379"
```

---

## Error: `ECONNREFUSED 127.0.0.1:1433` (SQL Server)

**Symptom:** Backend logs show database connection failures on startup.

**Causes & Fixes:**

### 1. SQL Server container is not running
```powershell
cd "f:\CV\E-Commerce Platform"
docker compose up -d mssql
docker compose logs -f mssql   # Wait for "SQL Server is now ready"
```

### 2. SQL Server is still initializing
SQL Server takes ~30s on first boot. The backend retry logic (5 attempts, exponential backoff) handles this automatically. Watch logs:
```
⚠️  Database connection attempt 1/5 failed. Retrying in 2s...
⚠️  Database connection attempt 2/5 failed. Retrying in 4s...
✅ Database connected successfully (attempt 3/5).
```

### 3. Wrong password in DATABASE_URL
Ensure the password in your `.env` matches `DB_SA_PASSWORD` in `docker-compose.yml`. Default: `ApexLuxe@2024!`

### 4. Port 1433 is blocked by firewall or used by another process
```powershell
# Find what's using port 1433
netstat -ano | findstr "1433"
Get-Process -Id <PID>   # Replace <PID> with result from above
```

---

## Error: `ECONNREFUSED 127.0.0.1:6379` (Redis)

**Symptom:** Backend or BullMQ logs show Redis connection failures.

**Important:** The backend is designed to **continue running** even if Redis is down. Cache operations become no-ops and BullMQ queues pause.

### 1. Redis container is not running
```powershell
cd "f:\CV\E-Commerce Platform"
docker compose up -d redis
```

### 2. Redis requires auth but none is set
Check `REDIS_PASSWORD` in `.env`. If set, Redis will require authentication. If the password doesn't match, connection is rejected.

### 3. Port 6379 is in use
```powershell
netstat -ano | findstr "6379"
```

---

## Error: `Environment validation failed` on startup

**Symptom:**
```
❌ Environment validation failed. Backend cannot start.
Missing or invalid environment variables:
  [JWT_SECRET]: should not be empty
```

**Fix:** Copy `.env.example` to `.env` and fill in all required values. See `INFRASTRUCTURE_GUIDE.md` for the full variable reference.

```powershell
cd "f:\CV\E-Commerce Platform\backend"
copy .env.example .env
# Edit .env with your values
```

---

## Error: `Shopping cart is empty. Cannot checkout.`

**Symptom:** Checkout fails with this error after order appears to have been created.

**Cause:** Duplicate checkout submission — the order was created, then re-submitted.

**Fix:** This is handled by the `isSubmittingRef` mutex on the frontend. If you see this, check browser console for duplicate `POST /orders` calls and ensure JavaScript is not executing the checkout handler twice.

---

## Error: Prisma migration fails

### 1. Database doesn't exist yet
```powershell
# Connect to SQL Server and create the database
docker exec -it apex_luxe_mssql /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P "ApexLuxe@2024!" \
  -Q "CREATE DATABASE ApexLuxeDB"
```

### 2. Schema drift — migrations out of sync
```powershell
cd "f:\CV\E-Commerce Platform\backend"
npx prisma migrate reset    # WARNING: drops all data
npx prisma migrate deploy
```

---

## Error: `Port 5000 already in use`

**Symptom:** `EADDRINUSE: address already in use :::5000`

```powershell
# Find and kill the process
netstat -ano | findstr "5000"
taskkill /F /PID <PID>   # Replace <PID> with result

# Or kill all Node processes (be careful in dev)
taskkill /F /IM node.exe
```

---

## Error: `Invalid Stripe API key`

**Symptom:** Payments fail with Stripe authentication error.

**Fix:**
1. Ensure `STRIPE_SECRET_KEY` in `.env` starts with `sk_test_` (development) or `sk_live_` (production).
2. Do not use publishable keys (`pk_...`) on the backend.
3. Test key and live key are separate — make sure you're using the right environment.

---

## Error: OAuth redirect fails (`state` mismatch or session expired)

**Symptom:** After OAuth provider login, callback returns an error.

**Cause:** Express session lost between redirect and callback.

**Fix:**
1. Ensure `SESSION_SECRET` is set in `.env`.
2. Ensure cookies are not being blocked (try incognito mode).
3. For Google/Microsoft/GitHub: verify callback URL in provider console exactly matches `http://localhost:5000/api/v1/auth/{provider}/callback`.

---

## Docker: Container won't start (port conflict)

```powershell
# Stop all containers
docker compose down

# Find what's using port 1433 or 6379
netstat -ano | findstr "1433"
netstat -ano | findstr "6379"

# Stop the conflicting service or change docker-compose port mapping
```

---

## Full Reset (Nuclear Option)

```powershell
cd "f:\CV\E-Commerce Platform"

# Stop everything
docker compose down -v          # Remove containers + volumes (deletes all data)

# Kill all Node processes
taskkill /F /IM node.exe

# Reinstall dependencies
cd backend && npm install
cd ..\frontend && npm install

# Restart fresh
cd ..
docker compose up -d
cd backend && npx prisma migrate deploy
npm run start:dev
```
