# APEX LUXE — Production Deployment Guide

This guide describes the steps required to deploy the APEX LUXE platform to production. The platform uses a containerized, multi-tier architecture composed of:
1. **Next.js Frontend Application** (running on Node.js 20)
2. **NestJS Backend Gateway** (running on Node.js 20)
3. **Microsoft SQL Server Database**
4. **Redis Cache & BullMQ Message Broker**
5. **Traefik Reverse Proxy & Edge Router**
6. **Prometheus & Grafana Monitoring Tier**

---

## 1. Production Docker Stack

The production architecture is fully containerized and controlled via `docker-compose.prod.yml` in the root directory.

### Build and Run Command
To build images and boot the entire stack in detached production mode:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Stop Command
To stop the application services without losing persistent volumes:
```bash
docker compose -f docker-compose.prod.yml down
```

---

## 2. Reverse Proxy & SSL Setup

Traefik acts as the primary edge router and load balancer. In `docker-compose.prod.yml`, it routes incoming traffic based on hostname rules:
- **Frontend Routing**: Handles root domains and subdomains (e.g. `apexluxe.com` and `*.apexluxe.com`), routing them to container port `3000`.
- **Backend Routing**: Intercepts requests prefixing with `/api` or `/socket.io`, routing them to the NestJS container port `5000`.

### Configuring HTTPS / SSL (Let's Encrypt)
To enable automated SSL provisioning via Traefik in production, update the `traefik` service command block in `docker-compose.prod.yml`:

```yaml
  traefik:
    image: traefik:v2.10
    container_name: apex-luxe-proxy
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.myresolver.acme.tlschallenge=true"
      - "--certificatesresolvers.myresolver.acme.email=admin@apexluxe.com"
      - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt
```

And update backend/frontend labels to listen on `websecure` and use ACME resolvers:
```yaml
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`apexluxe.com`) || HostRegexp(`{subdomain:[a-z0-9-]+}.apexluxe.com`)"
      - "traefik.http.routers.frontend.entrypoints=websecure"
      - "traefik.http.routers.frontend.tls.certresolver=myresolver"
```

---

## 3. Production Environment Checklist (`.env`)

Verify that the following variables are correctly populated in your production server environment:

```ini
# Ports & Nodes
PORT=5000
NODE_ENV=production

# Database Configuration (ACID relayer)
DATABASE_URL="sqlserver://mssql:1433;database=apexluxe;user=SA;password=StrongSecuredPassword2026!;encrypt=true;trustServerCertificate=false"

# Redis Cache
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=SecuredRedisPass2026!

# JWT Token Settings
JWT_SECRET=super_secured_access_secret_hash_key_92u01j
JWT_EXPIRES_IN=900s
JWT_REFRESH_SECRET=super_secured_refresh_secret_hash_key_19j02d
JWT_REFRESH_EXPIRES_IN=7d

# Stripe live credentials
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudinary image storage
CLOUDINARY_CLOUD_NAME=apex-luxe-prod
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Groq Vision/LLM key
GROQ_API_KEY=gsk_...
```

---

## 4. Hosting Platform Deployments

### A. Virtual Private Server (VPS) / DigitalOcean Droplet
1. Provision a Droplet with Docker pre-installed.
2. Clone the repository onto the server.
3. Configure the `.env` file with production secrets.
4. Run:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

### B. Amazon Web Services (AWS)
- **Database**: Spin up an RDS SQL Server instance for production data durability. Update `DATABASE_URL` to point to RDS.
- **Compute (ECS / Fargate)**:
  - Create an ECS Cluster.
  - Define Task Definitions for `backend` and `frontend` using their respective `Dockerfile.prod` configurations.
  - Set up an Application Load Balancer (ALB) to handle SSL offloading and route `/api/*` to the backend service.
- **Caching**: Deploy an Amazon ElastiCache Redis replication group.

### C. Azure App Services & Container Apps
- **Database**: Spin up Azure SQL Database. Update `DATABASE_URL` (ensure encrypt=true).
- **Compute**: Deploy the frontend and backend containers directly via Azure Container Apps (ACA), utilizing built-in ingress, scaling, and DAPR integration.
