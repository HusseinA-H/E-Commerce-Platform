# APEX LUXE — Operations Runbook

This document details the operational runbooks and instructions for maintaining the APEX LUXE multi-tier platform in production.

---

## 1. System Health Indicators

| Metric | Warning Threshold | Critical Threshold | Target Action |
|---|---|---|---|
| **CPU Utilization (NestJS)** | > 70% for 5m | > 90% for 2m | Scale instances horizontally / Check for unoptimized loops |
| **Memory Utilization (NestJS)**| > 75% (1.5GB) | > 90% (1.8GB) | Trigger heap dump / Restart container |
| **SQL Server Pool Status** | > 80 active conns | > 95 active conns | Check for long-running unindexed transactions |
| **Redis Memory Usage** | > 70% maxmemory | > 90% maxmemory | Evict volatile keys / Scale Redis memory |
| **BullMQ Failed Jobs Rate** | > 5% of hourly | > 10% of hourly | Inspect webhook logs / Verify external API dependencies |

---

## 2. Common Incident Runbooks

### Incident A: NestJS Container Out of Memory (OOM)
- **Symptom**: NestJS backend container crashes and restarts continuously. Logs display `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`.
- **Immediate Action**:
  1. Boot the container with node memory limit flag (e.g. `NODE_OPTIONS="--max-old-space-size=2048"`).
  2. Inspect sentry memory profiles or check for memory leaks in long-lived variables (e.g. large arrays stored in global space).
  3. Restart the backend container:
     ```bash
     docker compose -f docker-compose.prod.yml restart backend
     ```

### Incident B: SQL Server Connection Timeout
- **Symptom**: HTTP requests return `503 Service Unavailable` with database connection errors in backend logs.
- **Immediate Action**:
  1. Check if the database container is running and healthy:
     ```bash
     docker ps -f name=apex-luxe-mssql
     ```
  2. If the container is stopped, check docker logs to see if it crashed due to memory/disk space limits:
     ```bash
     docker logs apex-luxe-mssql
     ```
  3. Check the host disk usage:
     ```bash
     df -h
     ```
  4. Restart the SQL Server instance and monitor startup checks:
     ```bash
     docker compose -f docker-compose.prod.yml restart mssql
     ```

### Incident C: Stripe Webhook Processing Queue Backlog
- **Symptom**: Customers complain that their order confirmations are delayed, but payment is successful in Stripe. BullMQ dashboard shows high count of `waiting` or `failed` webhook jobs.
- **Immediate Action**:
  1. Open the Bull Board administrative UI (routed at `/api/docs/queues` or similar backend endpoint in development/production if enabled).
  2. Check if the Redis queue connection is active.
  3. If jobs are failing with Stripe Webhook Signature verification errors, check that the `STRIPE_WEBHOOK_SECRET` environment variable matches the active signing secret in the Stripe Dashboard.
  4. To retry failed jobs in bulk, run a command or click "Retry All" in the Bull Board UI.
