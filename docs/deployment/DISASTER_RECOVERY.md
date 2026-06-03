# APEX LUXE — Disaster Recovery & Resilience Guide

This guide documents the procedures for backup, restore, database recovery, caching node recovery, and handling operational failure modes.

---

## 1. Database Backup & Restore

We have created cross-platform database management scripts in the `scripts/` folder.

### A. Performing a Full Database Backup
The backup script extracts the active database state, writes it to a SQL Server `.bak` file, and saves it locally inside the `backups/` directory.

To run the backup:
```bash
node scripts/backup-db.js
```
The script will output a file named: `apexluxe-backup-[timestamp].bak`.

### B. Restoring from a Backup
The restore script terminates active connections, sets the database to `SINGLE_USER` mode to prevent locks, restores the `.bak` schema, and reverts the state back to `MULTI_USER`.

To restore the latest backup:
```bash
node scripts/restore-db.js
```
To restore a specific backup file:
```bash
node scripts/restore-db.js apexluxe-backup-2026-06-01T04-30-00.bak
```

---

## 2. Redis Caching & Queue Recovery

- **Persistence Settings**: In the production configuration, Redis is configured with:
  - `--appendonly yes` (AOF logs all write operations)
  - `--appendfsync everysec` (forces fsync once per second for minimal data loss risk)
  - `--save 60 1` (saves snapshot if at least 1 key changes in 60 seconds)
- **Queue Retries**: BullMQ processes background jobs (like Stripe webhooks and email alerts) using a Redis-backed queue. If Redis crashes:
  - Active jobs in the queue will be reloaded from the AOF/RDB file when the container restarts.
  - Jobs are configured with an exponential backoff retry strategy (`retries: 3`, `backoff: { type: 'exponential', delay: 1000 }`), preventing temporary connection dropouts from dropping events.

---

## 3. Degraded-Mode Operations

The application has been engineered to remain online during database or Redis infrastructure dropouts:

### A. Database Down
- `PrismaService` features an automatic connection retry loop on startup (5 attempts with exponential backoff).
- If SQL Server is completely unreachable, the service enters **Degraded Mode** instead of failing. Health checks will return `503 Service Unavailable`, and endpoints requiring database access will fail safely, but the NestJS application context remains online, attempting background recovery connection polls every 30 seconds.

### B. Redis Cache Down
- `RedisService` configures connection error handlers (`connect`, `close`, `error`).
- If Redis is down, calls to `RedisService.get` and `set` fail silently and return `null`, allowing API controllers to fetch data directly from SQL Server without throwing HTTP 500 errors.
