/**
 * APEX LUXE — Enterprise Prisma Seed
 * =====================================
 * Deterministic, idempotent, transactionally-safe seeder.
 *
 * Image source: frontend/public/products/<Category>/<filename>
 * URL format  : /products/<encoded-folder>/<filename>
 *
 * Run: npm run seed
 * Reset + Seed: npm run db:reset
 */

import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// ─── Environment ─────────────────────────────────────────────────────────────
dotenv.config({ path: path.join(__dirname, '../.env') });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌  DATABASE_URL is not set. Check your .env file.');
  process.exit(1);
}

// ─── Prisma client ───────────────────────────────────────────────────────────
const adapter = new PrismaMssql(url);
const prisma = new PrismaClient({ adapter });

// ─── Types ───────────────────────────────────────────────────────────────────
type CategoryKey = 'outerwear' | 'tops' | 'bottoms' | 'footwear' | 'accessories';

interface AssetEntry {
  categoryKey: CategoryKey;
  folderName: string;       // exact folder name on disk, e.g. "Tops & Tees"
  encodedFolder: string;    // URL-safe folder, e.g. "Tops%20%26%20Tees"
  filename: string;
  url: string;              // frontend-ready URL, e.g. /products/Tops%20%26%20Tees/Apex-Compression-Tee-Black-cover.png
}

interface ProductSeed {
  slug: string;
  name: string;
  categoryKey: CategoryKey;
  price: number;
  compareAtPrice: number | null;
  description: string;
  images: string[];
  specs: { key: string; value: string }[];
  sizes: string[];
  colors: string[];
  isNew: boolean;
  isLimited: boolean;
  stock: number;
}

// ─── Image Discovery ─────────────────────────────────────────────────────────

/**
 * Resolves the frontend/public/products directory from the seed script location.
 * Tries multiple candidate paths to work from any CWD.
 */
function resolveImageDir(): string {
  const candidates = [
    // When running from backend/ via ts-node prisma/seed.ts
    path.join(__dirname, '../../frontend/public/products'),
    // When CWD is project root
    path.join(process.cwd(), 'frontend/public/products'),
    // When CWD is backend/
    path.join(process.cwd(), '../frontend/public/products'),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  console.error('❌  Could not find frontend/public/products in any of:');
  candidates.forEach((c) => console.error('    ', c));
  process.exit(1);
}

/** Maps folder names to internal category keys */
const FOLDER_TO_CATEGORY: Record<string, CategoryKey> = {
  'Accessories':       'accessories',
  'Bottoms & Joggers': 'bottoms',
  'Footwear':          'footwear',
  'Outerwear':         'outerwear',
  'Tops & Tees':       'tops',
};

/** Scan the image directory and return all detected asset entries. */
function scanAssets(imageDir: string): AssetEntry[] {
  const entries: AssetEntry[] = [];
  const folders = fs.readdirSync(imageDir).sort();

  for (const folder of folders) {
    const folderPath = path.join(imageDir, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const categoryKey = FOLDER_TO_CATEGORY[folder];
    if (!categoryKey) {
      console.warn(`  ⚠️  Unknown folder "${folder}" — skipping.`);
      continue;
    }

    const encodedFolder = encodeURIComponent(folder);
    const files = fs.readdirSync(folderPath).sort();

    for (const filename of files) {
      const ext = path.extname(filename).toLowerCase();
      if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) continue;

      const fullPath = path.join(folderPath, filename);
      if (!fs.statSync(fullPath).isFile()) continue;

      entries.push({
        categoryKey,
        folderName: folder,
        encodedFolder,
        filename,
        url: `/products/${encodedFolder}/${filename}`,
      });
    }
  }

  return entries;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Deterministic hash — same input always produces same number. */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function titleCase(s: string): string {
  return s
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Extract product name and color variant from a cover filename. */
function parseFilename(filename: string): { baseName: string; color: string | null } {
  // Strip extension and -cover suffix
  const stem = filename
    .replace(/\.(png|jpg|jpeg|webp)$/i, '')
    .replace(/-cover$/i, '');

  const parts = stem.split('-');
  const lastPart = parts[parts.length - 1]?.toLowerCase() ?? '';
  const colorTokens = ['black', 'white', 'grey', 'gray', 'blue', 'red', 'navy', 'green'];

  if (colorTokens.includes(lastPart)) {
    const nameStr = parts.slice(0, -1).join(' ');
    return { baseName: titleCase(nameStr), color: titleCase(lastPart) };
  }

  return { baseName: titleCase(parts.join(' ')), color: null };
}

// ─── Product Attribute Generators ─────────────────────────────────────────────

function getSizes(cat: CategoryKey): string[] {
  if (cat === 'footwear')    return ['UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12'];
  if (cat === 'accessories') return ['One Size'];
  return ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
}

function getBasePrice(cat: CategoryKey, name: string): number {
  const base: Record<CategoryKey, number> = {
    accessories: 49,
    bottoms:     89,
    footwear:    159,
    outerwear:   169,
    tops:        69,
  };
  const premiumKw = ['bomber', 'windbreaker', 'hoodie', 'runners', 'sneakers', 'pro', 'titan', 'carbon'];
  const nameLow = name.toLowerCase();
  const premium = premiumKw.some((kw) => nameLow.includes(kw)) ? 30 : 0;
  const variance = hashStr(name) % 41; // 0–40
  return base[cat] + premium + variance;
}

function getCompareAtPrice(price: number, name: string): number | null {
  // ~40% of products have a sale price
  if (hashStr(name + '-sale') % 5 < 2) {
    return Math.round((price * 1.25) / 5) * 5; // round to nearest $5
  }
  return null;
}

function getStock(name: string): number {
  const base = 30 + (hashStr(name + '-stock') % 71); // 30–100
  return base;
}

function getDescription(cat: CategoryKey, name: string): string {
  const descs: Record<CategoryKey, string[]> = {
    tops: [
      `${name} is built with advanced moisture-management fabric that keeps you dry and comfortable through the most intense training sessions. Flatlock seams prevent chafing during extended wear.`,
      `Engineered for elite performance, the ${name} features AERO-KNIT™ technology that adapts to your body temperature, delivering superior breathability when it matters most.`,
      `The ${name} combines a streamlined athletic cut with four-way stretch fabric, giving you complete freedom of movement whether you're lifting, running, or training outdoors.`,
    ],
    bottoms: [
      `${name} delivers unrestricted movement with four-way mechanical stretch and a tapered athletic silhouette. Secure zip pockets keep your essentials safely stowed during any workout.`,
      `Crafted from our proprietary AERO-KNIT™ blend, the ${name} features articulated knee panelling and a performance waistband engineered for maximum comfort during high-intensity sessions.`,
      `The ${name} pairs technical precision with everyday wearability — moisture-wicking, quick-drying, and built to outlast the hardest training days.`,
    ],
    footwear: [
      `${name} features a responsive CARBON-CORE™ midsole that returns energy with every stride, paired with an engineered mesh upper for unmatched breathability and support.`,
      `Built for speed and endurance, the ${name} combines a high-traction outsole with precision heel lockdown technology, delivering stability whether you're on the track or in the gym.`,
      `The ${name} is designed from the ground up for performance athletes — lightweight, reactive, and built to handle everything from HIIT to marathon training.`,
    ],
    outerwear: [
      `${name} shields you from the elements with a HYDROSHELL™ weather-resistant outer layer while maintaining breathability for high-output activity in unpredictable conditions.`,
      `Engineered for layering, the ${name} features a packable, lightweight construction and ergonomic seam placement to eliminate shoulder restriction during dynamic movement.`,
      `The ${name} is our answer to all-conditions performance wear — combining technical fabrics with a refined silhouette that transitions seamlessly from training to street.`,
    ],
    accessories: [
      `${name} is built for athletes who demand more from their gear — durable technical fabrics, smart storage solutions, and signature APEX LUXE branding that sets you apart.`,
      `Engineered for daily performance, the ${name} balances functionality with premium aesthetics, making it the perfect training companion for every session.`,
      `The ${name} combines lightweight utility design with all-day comfort, purpose-built to keep up with your most demanding training schedule.`,
    ],
  };

  const pool = descs[cat];
  return pool[hashStr(name) % pool.length];
}

function getSpecs(cat: CategoryKey, name: string): { key: string; value: string }[] {
  const shared = [
    { key: 'Construction', value: 'Precision flatlock seams' },
    { key: 'Branding',     value: 'Signature reflective APEX LUXE logo' },
  ];

  const catSpecs: Record<CategoryKey, { key: string; value: string }[]> = {
    tops: [
      { key: 'Material', value: '88% Recycled Polyester, 12% Elastane' },
      { key: 'Technology', value: 'AERO-KNIT™ moisture management' },
      { key: 'Fit', value: 'Athletic compression cut' },
      { key: 'Care', value: 'Machine wash cold, tumble dry low' },
    ],
    bottoms: [
      { key: 'Material', value: '92% Nylon, 8% Spandex' },
      { key: 'Stretch', value: '4-way mechanical stretch' },
      { key: 'Pockets', value: 'Secure low-profile zip side pockets' },
      { key: 'Care', value: 'Machine wash cold, tumble dry low' },
    ],
    footwear: [
      { key: 'Midsole', value: 'Responsive CARBON-CORE™ foam' },
      { key: 'Outsole', value: 'High-traction vulcanised rubber' },
      { key: 'Upper', value: 'Engineered breathable mesh with TPU overlays' },
      { key: 'Care', value: 'Wipe clean with damp cloth, air dry' },
    ],
    outerwear: [
      { key: 'Shell', value: 'HYDROSHELL™ weather-resistant ripstop' },
      { key: 'Lining', value: 'Performance fleece interior' },
      { key: 'Fit', value: 'Athletic fit with room to layer' },
      { key: 'Care', value: 'Machine wash cold, hang dry' },
    ],
    accessories: [
      { key: 'Material', value: 'Durable 600D reinforced polyester' },
      { key: 'Profile', value: 'Ergonomic lightweight utility design' },
      { key: 'Versatility', value: 'All-day comfort and durability' },
      { key: 'Care', value: 'Spot clean, air dry' },
    ],
  };

  return [...catSpecs[cat], ...shared];
}

// ─── Product Builder ───────────────────────────────────────────────────────────

function buildProducts(assets: AssetEntry[]): ProductSeed[] {
  // Group images by product slug (merge color variants into one product)
  const productMap = new Map<string, ProductSeed>();

  for (const asset of assets) {
    const { baseName, color } = parseFilename(asset.filename);
    const slug = slugify(baseName);

    if (!productMap.has(slug)) {
      const price = getBasePrice(asset.categoryKey, baseName);
      const compareAtPrice = getCompareAtPrice(price, baseName);
      const stock = getStock(baseName);
      const isNew = hashStr(slug + '-new') % 5 === 0;       // ~20% are "new"
      const isLimited = hashStr(slug + '-lim') % 8 === 0;   // ~12% are "limited"

      productMap.set(slug, {
        slug,
        name: baseName,
        categoryKey: asset.categoryKey,
        price,
        compareAtPrice,
        description: getDescription(asset.categoryKey, baseName),
        images: [],
        specs: getSpecs(asset.categoryKey, baseName),
        sizes: getSizes(asset.categoryKey),
        colors: [],
        isNew,
        isLimited,
        stock,
      });
    }

    const product = productMap.get(slug)!;

    // Add image (deduplicate)
    if (!product.images.includes(asset.url)) {
      product.images.push(asset.url);
    }

    // Add color variant (deduplicate)
    const colorLabel = color ?? 'Black';
    if (!product.colors.includes(colorLabel)) {
      product.colors.push(colorLabel);
    }
  }

  return Array.from(productMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Review Generator ────────────────────────────────────────────────────────

const REVIEW_POOL = [
  { rating: 5, title: 'Outstanding Quality',      comment: 'Absolutely love this product. The quality is exceptional and it performs exactly as advertised. Will buy again.' },
  { rating: 5, title: 'Best I\'ve Owned',          comment: 'After trying many brands, this is by far the best. Fits perfectly and the material feels premium.' },
  { rating: 4, title: 'Great Performance Gear',   comment: 'Really impressed with how well this holds up during intense workouts. Slight sizing issue but otherwise perfect.' },
  { rating: 5, title: 'Exceeded Expectations',    comment: 'Bought this on a recommendation and wasn\'t disappointed. Exceptional value for the quality delivered.' },
  { rating: 4, title: 'Solid Training Companion', comment: 'The build quality is excellent. Very comfortable during long sessions. Would recommend to fellow athletes.' },
  { rating: 5, title: 'Elite Performance',        comment: 'Used this during competition prep — held up through everything. This is next-level gear.' },
  { rating: 3, title: 'Good but Not Perfect',     comment: 'Solid quality overall, but runs slightly large. Size down if in doubt. Still a very good product.' },
  { rating: 5, title: 'Premium Feel',             comment: 'You can tell this is made with care. The stitching, material and fit are all dialed in perfectly.' },
  { rating: 4, title: 'Highly Recommend',         comment: 'Great buy. Looks even better in person. Fast shipping and arrived in perfect condition.' },
  { rating: 5, title: 'Worth Every Penny',        comment: 'Expensive? Yes. Worth it? Absolutely. This is the standard other brands should be measured against.' },
];

// ─── Coupons ─────────────────────────────────────────────────────────────────

const COUPONS = [
  { code: 'APEX10',    discountPercent: 10, maxUses: 1000, days: 60,  description: '10% off sitewide' },
  { code: 'LAUNCH20',  discountPercent: 20, maxUses: 500,  days: 30,  description: '20% off — launch special' },
  { code: 'ATHLETE15', discountPercent: 15, maxUses: 750,  days: 90,  description: '15% off for athletes' },
  { code: 'FIRSTBUY',  discountPercent: 25, maxUses: 100,  days: 30,  description: '25% off first purchase' },
];

// ─── Demo Users ───────────────────────────────────────────────────────────────

const DEMO_USERS = [
  { email: 'admin@apexluxe.com',  name: 'Apex Admin',    role: 'super_admin' },
  { email: 'alex@mercer.com',     name: 'Alex Mercer',   role: 'customer' },
  { email: 'sarah@johnson.com',   name: 'Sarah Johnson', role: 'customer' },
  { email: 'marcus@wei.com',      name: 'Marcus Wei',    role: 'customer' },
  { email: 'vendor@fitgear.com',  name: 'FitGear Pro',   role: 'customer' },
];

// ─── Main Seeder ─────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  APEX LUXE — Database Seeder');
  console.log('══════════════════════════════════════════════════════\n');

  // ── 0. Discover images ──────────────────────────────────────────────────────
  const imageDir = resolveImageDir();
  console.log(`📁  Scanning images from: ${imageDir}`);
  const assets = scanAssets(imageDir);
  console.log(`🖼️   Found ${assets.length} image assets across ${Object.keys(FOLDER_TO_CATEGORY).length} categories.\n`);

  if (assets.length === 0) {
    console.error('❌  No images found — cannot seed products without assets.');
    process.exit(1);
  }

  // ── 1. Build product seed data from images ──────────────────────────────────
  const productsData = buildProducts(assets);
  console.log(`📦  Built ${productsData.length} products from image assets.\n`);

  // Print asset mapping summary
  const byCategory = new Map<string, number>();
  for (const p of productsData) {
    byCategory.set(p.categoryKey, (byCategory.get(p.categoryKey) ?? 0) + 1);
  }
  byCategory.forEach((count, cat) => console.log(`    ├─ ${cat}: ${count} products`));
  console.log();

  // ── 2. Seed Users ───────────────────────────────────────────────────────────
  console.log('👤  Seeding users...');
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const userMap: Record<string, string> = {}; // email → id

  for (const u of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name },
      create: { email: u.email, passwordHash, name: u.name, role: u.role, isVerified: true },
    });
    userMap[u.email] = user.id;
  }
  console.log(`    ✅  ${DEMO_USERS.length} users seeded.\n`);

  const customerIds = DEMO_USERS
    .filter((u) => u.role === 'customer')
    .map((u) => userMap[u.email]);

  // ── 3. Seed Categories ──────────────────────────────────────────────────────
  console.log('🗂️   Seeding categories...');
  const categoryDefs = [
    { slug: 'outerwear',    name: 'Outerwear',          description: 'Technical windbreakers, weather shells, and performance jackets engineered for all-conditions training.' },
    { slug: 'tops',         name: 'Tops & Tees',        description: 'High-performance compression tops, base layers, and workout tees for every training environment.' },
    { slug: 'bottoms',      name: 'Bottoms & Joggers',  description: 'Ergonomic joggers, track pants, and training shorts designed for complete freedom of movement.' },
    { slug: 'footwear',     name: 'Footwear',           description: 'Responsive running shoes, carbon-propulsion racing trainers, and cross-training sneakers.' },
    { slug: 'accessories',  name: 'Accessories',        description: 'Technical training bags, precision headwear, gym gloves, and performance support gear.' },
  ];

  const categoryIdMap: Record<string, string> = {}; // slug → id
  for (const cat of categoryDefs) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description },
      create: { name: cat.name, slug: cat.slug, description: cat.description },
    });
    categoryIdMap[cat.slug] = record.id;
  }
  console.log(`    ✅  ${categoryDefs.length} categories seeded.\n`);

  // ── 4. Seed Products ────────────────────────────────────────────────────────
  console.log('🏷️   Seeding products...');

  // Remove products that no longer have a corresponding image asset
  const activeSlugs = productsData.map((p) => p.slug);
  const stale = await prisma.product.findMany({ where: { slug: { notIn: activeSlugs } } });
  if (stale.length > 0) {
    await prisma.product.deleteMany({ where: { slug: { notIn: activeSlugs } } });
    console.log(`    🗑️   Removed ${stale.length} stale products.`);
  }

  let newCount = 0;
  let updatedCount = 0;

  for (const item of productsData) {
    const categoryId = categoryIdMap[item.categoryKey];
    const existing = await prisma.product.findUnique({ where: { slug: item.slug } });

    let productId: string;

    const sku = `APX-${item.slug.toUpperCase().slice(0, 8)}`;
    const barcode = `12345678${String(hashStr(item.slug)).slice(0, 4)}`;
    const inventoryStatus = item.stock === 0 ? 'OUT_OF_STOCK' : (item.stock <= 5 ? 'LOW_STOCK' : 'IN_STOCK');

    if (existing) {
      // Update core fields
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          name:          item.name,
          description:   item.description,
          price:         item.price,
          compareAtPrice: item.compareAtPrice,
          isNew:         item.isNew,
          isLimited:     item.isLimited,
          stock:         item.stock,
          stockQuantity: item.stock,
          sku,
          barcode,
          inventoryStatus,
          categoryId,
        },
      });
      productId = existing.id;
      updatedCount++;

      // Refresh all image/size/color/spec relations
      await Promise.all([
        prisma.productImage.deleteMany({ where: { productId } }),
        prisma.productSize.deleteMany({ where: { productId } }),
        prisma.productColor.deleteMany({ where: { productId } }),
        prisma.productSpec.deleteMany({ where: { productId } }),
      ]);
    } else {
      const created = await prisma.product.create({
        data: {
          name:          item.name,
          slug:          item.slug,
          description:   item.description,
          price:         item.price,
          compareAtPrice: item.compareAtPrice,
          stock:         item.stock,
          stockQuantity: item.stock,
          sku,
          barcode,
          inventoryStatus,
          isNew:         item.isNew,
          isLimited:     item.isLimited,
          categoryId,
        },
      });
      productId = created.id;
      newCount++;

      // Seed review(s) for newly created products
      const reviewCount = 1 + (hashStr(item.slug + '-reviews') % 3); // 1–3 reviews
      for (let r = 0; r < reviewCount; r++) {
        const reviewTemplate = REVIEW_POOL[(hashStr(item.slug + r) % REVIEW_POOL.length)];
        const reviewerId = customerIds[(hashStr(item.slug + r + '-user') % customerIds.length)];
        const existingReview = await prisma.review.findFirst({
          where: { productId, userId: reviewerId },
        });
        if (!existingReview) {
          await prisma.review.create({
            data: {
              userId:             reviewerId,
              productId,
              rating:             reviewTemplate.rating,
              title:              reviewTemplate.title,
              comment:            reviewTemplate.comment,
              isVerifiedPurchase: r === 0, // first review is a verified purchase
            },
          });
        }
      }
    }

    // Re-create relations
    if (item.images.length > 0) {
      await prisma.productImage.createMany({
        data: item.images.map((url, i) => ({ url, isPrimary: i === 0, productId })),
      });
    }

    await prisma.productSize.createMany({
      data: item.sizes.map((size) => ({ size, productId })),
    });

    await prisma.productColor.createMany({
      data: item.colors.map((color) => ({ color, productId })),
    });

    const specsToInsert = item.specs.map((s) => ({ key: s.key, value: s.value, productId }));
    await prisma.productSpec.createMany({ data: specsToInsert });
  }

  console.log(`    ✅  ${newCount} products created, ${updatedCount} updated.\n`);

  // ── 5. Seed Coupons ─────────────────────────────────────────────────────────
  console.log('🎟️   Seeding coupons...');
  for (const coupon of COUPONS) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: { discountPercent: coupon.discountPercent, isActive: true },
      create: {
        code:            coupon.code,
        discountPercent: coupon.discountPercent,
        expiresAt:       new Date(Date.now() + coupon.days * 24 * 60 * 60 * 1000),
        maxUses:         coupon.maxUses,
        isActive:        true,
      },
    });
  }
  console.log(`    ✅  ${COUPONS.length} coupons seeded.\n`);

  // ── 6. Summary ──────────────────────────────────────────────────────────────
  const [totalProducts, totalCategories, totalImages, totalCoupons, totalUsers, totalReviews] =
    await Promise.all([
      prisma.product.count(),
      prisma.category.count(),
      prisma.productImage.count(),
      prisma.coupon.count(),
      prisma.user.count(),
      prisma.review.count(),
    ]);

  console.log('══════════════════════════════════════════════════════');
  console.log('  ✅  Seeding Complete!');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  Products   : ${totalProducts}`);
  console.log(`  Categories : ${totalCategories}`);
  console.log(`  Images     : ${totalImages}`);
  console.log(`  Reviews    : ${totalReviews}`);
  console.log(`  Coupons    : ${totalCoupons}`);
  console.log(`  Users      : ${totalUsers}`);
  console.log('------------------------------------------------------');
  console.log('  Demo credentials (all use Password123!):');
  DEMO_USERS.forEach((u) => {
    console.log(`    [${u.role.padEnd(8)}] ${u.email}`);
  });
  console.log('  Active coupon codes:');
  COUPONS.forEach((c) => console.log(`    ${c.code.padEnd(12)} — ${c.discountPercent}% off`));
  console.log('══════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('\n❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
