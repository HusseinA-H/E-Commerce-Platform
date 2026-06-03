# Database Seeding Guide

## Overview

APEX LUXE uses a deterministic, idempotent Prisma seeder that:
- Scans **real product images** from `frontend/public/products/`
- Builds products automatically from the image folder structure
- Maps each image to its product with a deterministic (non-random) algorithm
- Is fully re-runnable — safe to run multiple times without creating duplicates

---

## Quick Start

```powershell
# From the backend directory:
cd "f:\CV\E-Commerce Platform\backend"

# Seed the database (idempotent — safe to run multiple times):
npm run seed

# Full reset: wipe DB, re-apply migrations, then re-seed:
npm run db:reset

# Or with Prisma CLI directly:
npx prisma db seed
```

---

## What Gets Seeded

| Entity | Count | Details |
|--------|-------|---------|
| **Categories** | 5 | Outerwear, Tops & Tees, Bottoms & Joggers, Footwear, Accessories |
| **Products** | 25 | Auto-discovered from image assets |
| **Product Images** | 31 | Mapped 1:1 from `frontend/public/products/` |
| **Product Sizes** | Per product | Apparel: XS–XXL · Footwear: UK 7–12 · Accessories: One Size |
| **Product Colors** | Per product | Extracted from filename (Black, White, or detected) |
| **Product Specs** | Per product | Category-specific tech specs (material, care, fit, etc.) |
| **Reviews** | ~50 | 1–3 per new product, with verified purchase flags |
| **Coupons** | 4 | See coupon table below |
| **Users** | 5 | Admin + 4 customers |

---

## Image Mapping

### How It Works

1. The seeder scans `frontend/public/products/<Category>/` for `.png`, `.jpg`, `.jpeg`, `.webp` files
2. Filenames follow the pattern: `<Product-Name>[-Color]-cover.png`
3. Products with multiple color variants (e.g. Black/White) are **merged into a single product** with multiple images
4. Image URLs are generated as: `/products/<URL-encoded-folder>/<filename>`

### Folder → Category Mapping

| Folder on Disk | Category Key | Category Name |
|---|---|---|
| `Accessories/` | `accessories` | Accessories |
| `Bottoms & Joggers/` | `bottoms` | Bottoms & Joggers |
| `Footwear/` | `footwear` | Footwear |
| `Outerwear/` | `outerwear` | Outerwear |
| `Tops & Tees/` | `tops` | Tops & Tees |

### Example URL Generation

```
File:  frontend/public/products/Tops & Tees/Apex-Compression-Tee-Black-cover.png
URL:   /products/Tops%20%26%20Tees/Apex-Compression-Tee-Black-cover.png

File:  frontend/public/products/Footwear/AeroSprint-Runners-cover.png  
URL:   /products/Footwear/AeroSprint-Runners-cover.png
```

### Deterministic Mapping

The mapping is **deterministic** — same filenames always produce the same products, prices, and flags. This is achieved via a string hash function (`hashStr`) that derives:
- Price variations
- `isNew` / `isLimited` flags
- Review template selection
- Color fallbacks

---

## Demo Accounts

All accounts use the password: **`Password123!`**

| Role | Email |
|------|-------|
| Admin | `admin@apexluxe.com` |
| Customer | `alex@mercer.com` |
| Customer | `sarah@johnson.com` |
| Customer | `marcus@wei.com` |
| Customer | `vendor@fitgear.com` |

---

## Coupon Codes

| Code | Discount | Max Uses | Expires |
|------|----------|----------|---------|
| `APEX10` | 10% | 1000 | 60 days |
| `LAUNCH20` | 20% | 500 | 30 days |
| `ATHLETE15` | 15% | 750 | 90 days |
| `FIRSTBUY` | 25% | 100 | 30 days |

---

## Reseed After DB Reset

After a full Docker volume wipe and fresh migration:

```powershell
# 1. Ensure containers are healthy
docker compose up -d
Start-Sleep -Seconds 45   # wait for SQL Server to initialize

# 2. Create the database (required after volume wipe)
docker exec apex_luxe_mssql /opt/mssql-tools18/bin/sqlcmd `
  -S localhost -U SA -P "ApexLuxe@2024!" -C `
  -Q "IF NOT EXISTS (SELECT name FROM sys.databases WHERE name='apexluxe') CREATE DATABASE apexluxe;"

# 3. Apply migrations
cd "f:\CV\E-Commerce Platform\backend"
npx prisma migrate deploy

# 4. Seed the database
npm run seed

# 5. Flush Redis cache (if backend was running during the wipe)
docker exec apex_luxe_redis redis-cli -a "ApexLuxeRedis2026!" --no-auth-warning FLUSHALL
```

Or just run the diagnostics script which handles steps 1–3 automatically:
```powershell
.\scripts\infra-diagnose.ps1
```

---

## Troubleshooting

### Products not appearing on storefront

**1. Check Redis cache is stale:**
```powershell
# Flush all Redis keys to force a fresh DB read
docker exec apex_luxe_redis redis-cli -a "ApexLuxeRedis2026!" --no-auth-warning FLUSHALL
```

**2. Verify products exist in DB:**
```powershell
Invoke-RestMethod "http://localhost:5000/api/v1/products" | Select-Object -ExpandProperty Count
```

**3. Check image files exist:**
```powershell
Get-ChildItem "f:\CV\E-Commerce Platform\frontend\public\products" -Recurse -File | Measure-Object
```

### Seed fails with "Cannot find module"
Ensure you run the seed from the `backend/` directory:
```powershell
cd "f:\CV\E-Commerce Platform\backend"
npm run seed
```

### Seed fails with "DATABASE_URL not set"
Ensure `.env` exists in `backend/`:
```powershell
Get-Content "f:\CV\E-Commerce Platform\backend\.env" | Select-String "DATABASE_URL"
```

### Images 404 on frontend
Ensure the Next.js dev server is running and serving the `public/` directory:
```powershell
cd "f:\CV\E-Commerce Platform\frontend"
npm run dev
```

Images are served from `http://localhost:3000/products/<folder>/<filename>`.

### Duplicate products after reseed
The seeder uses Prisma `upsert` — it will never create duplicates. If you see duplicates, run:
```powershell
npm run db:reset   # Wipes DB + re-applies migrations + reseeds cleanly
```

---

## Seed Architecture

```
backend/
├── prisma/
│   └── seed.ts          ← Main seeder (deterministic, idempotent)
├── prisma.config.ts     ← Prisma CLI config (points to seed.ts)
└── package.json         ← "seed" and "db:reset" scripts

frontend/
└── public/
    └── products/        ← Image source scanned by seeder
        ├── Accessories/
        ├── Bottoms & Joggers/
        ├── Footwear/
        ├── Outerwear/
        └── Tops & Tees/
```

### Seed Execution Flow

```
1. resolveImageDir()     → locates frontend/public/products
2. scanAssets()          → discovers all image files
3. buildProducts()       → groups images by product slug, extracts colors
4. seed users           → upsert 5 demo accounts
5. seed categories      → upsert 5 categories
6. seed products        → upsert each product + images + sizes + colors + specs
7. seed reviews         → create 1–3 reviews per NEW product
8. seed coupons         → upsert 4 discount codes
9. Print summary        → counts, credentials, coupon codes
```
