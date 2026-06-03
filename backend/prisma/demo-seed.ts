import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';

const databaseUrl = process.env.DATABASE_URL || 'sqlserver://localhost:1433;database=apexluxe;user=SA;password=StrongPassword123!;encrypt=true;trustServerCertificate=true';
const adapter = new PrismaMssql(databaseUrl);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('==================================================');
  console.log('APEX LUXE — Demo Sandbox Provisioning');
  console.log('==================================================');

  const demoSubdomain = 'demo-sandbox';
  
  // 1. Delete existing demo sandbox data to allow clean re-runs
  const existingTenant = await prisma.tenant.findUnique({
    where: { subdomain: demoSubdomain },
  });

  if (existingTenant) {
    console.log(`Cleaning up existing tenant: ${demoSubdomain}...`);
    await prisma.tenant.delete({ where: { id: existingTenant.id } });
  }

  // 2. Create the Tenant
  console.log(`Creating Tenant: ${demoSubdomain}...`);
  const tenant = await prisma.tenant.create({
    data: {
      name: 'APEX LUXE Sandbox Store',
      subdomain: demoSubdomain,
      customDomain: 'sandbox.apexluxe.local',
      isActive: true,
    },
  });

  // 3. Create Tenant Settings with neon-cyberpunk/dark luxury aesthetics
  console.log('Creating Tenant settings...');
  const settings = await prisma.tenantSettings.create({
    data: {
      tenantId: tenant.id,
      storeName: 'APEX LUXE Sandbox',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200',
      primaryColor: '#0a051d',
      secondaryColor: '#ff007f',
      accentColor: '#39ff14',
      themeName: 'cyberpunk',
      customCss: `
        .sandbox-glow {
          text-shadow: 0 0 8px var(--secondary-color);
        }
        .sandbox-card {
          border: 1px solid var(--secondary-color);
          box-shadow: 0 0 15px rgba(255, 0, 127, 0.15);
        }
      `,
      cmsJson: JSON.stringify({
        hero: {
          title: 'APEX LUXE SANDBOX',
          subtitle: 'Multi-Tenant Simulation Active',
          buttonText: 'Explore Catalog',
          imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200',
        },
      }),
    },
  });

  // 4. Create Demo User
  console.log('Creating Demo Tenant owner user...');
  const user = await prisma.user.create({
    data: {
      email: 'owner@sandbox.apexluxe.com',
      name: 'Sandbox Owner',
      role: 'admin',
      isVerified: true,
      tenantId: tenant.id,
    },
  });

  // Create TenantUser relation
  await prisma.tenantUser.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      role: 'owner',
    },
  });

  // 5. Create default Category
  console.log('Creating Demo Categories...');
  const category = await prisma.category.create({
    data: {
      name: 'Sandbox Performance Wear',
      slug: 'sandbox-performance',
      description: 'Sportswear products curated for the sandbox environment.',
      tenantId: tenant.id,
    },
  });

  // 6. Create Demo Products
  console.log('Creating Demo Products...');
  const product1 = await prisma.product.create({
    data: {
      name: 'Apex Carbon Windbreaker',
      slug: 'apex-carbon-windbreaker-demo',
      description: 'Ultralight waterproof running shell with reflective grid lining.',
      price: 280.0,
      compareAtPrice: 320.0,
      stockQuantity: 45,
      sku: 'APX-CARB-WND-DEMO',
      inventoryStatus: 'IN_STOCK',
      categoryId: category.id,
      tenantId: tenant.id,
      isFeatured: true,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600', isPrimary: true },
        ],
      },
      colors: {
        create: [{ color: 'Onyx Black' }, { color: 'Neon Pink' }],
      },
      sizes: {
        create: [{ size: 'S' }, { size: 'M' }, { size: 'L' }],
      },
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'Titanium Thermal Tights',
      slug: 'titanium-thermal-tights-demo',
      description: 'High-compression running tights with titanium mesh heat retention panels.',
      price: 180.0,
      stockQuantity: 12,
      sku: 'APX-TITA-THT-DEMO',
      inventoryStatus: 'LOW_STOCK',
      categoryId: category.id,
      tenantId: tenant.id,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600', isPrimary: true },
        ],
      },
      colors: {
        create: [{ color: 'Gunmetal Gray' }],
      },
      sizes: {
        create: [{ size: 'M' }, { size: 'XL' }],
      },
    },
  });

  // 7. Create Demo Orders
  console.log('Creating Demo Orders & Transactions...');
  const order = await prisma.order.create({
    data: {
      orderNumber: 'APX-DEMO-001',
      userId: user.id,
      total: 460.0,
      subtotal: 460.0,
      tax: 0.0,
      discount: 0.0,
      status: 'processing',
      paymentStatus: 'paid',
      tenantId: tenant.id,
      items: {
        create: [
          {
            productId: product1.id,
            productName: product1.name,
            productPrice: product1.price,
            size: 'M',
            color: 'Onyx Black',
            quantity: 1,
            image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600',
          },
          {
            productId: product2.id,
            productName: product2.name,
            productPrice: product2.price,
            size: 'M',
            color: 'Gunmetal Gray',
            quantity: 1,
            image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600',
          },
        ],
      },
    },
  });

  await prisma.transaction.create({
    data: {
      orderId: order.id,
      stripePaymentIntentId: 'pi_demo_sandbox_intent_1',
      amount: 460.0,
      status: 'succeeded',
      type: 'charge',
    },
  });

  // 8. Create Demo Search Analytics Events
  console.log('Creating Demo Search Analytics Events...');
  await prisma.searchAnalyticsEvent.createMany({
    data: [
      { query: 'carbon windbreaker', source: 'semantic', resultCount: 5, latencyMs: 250, didClick: true, didConvert: true, tenantId: tenant.id },
      { query: 'compression tights', source: 'semantic', resultCount: 8, latencyMs: 180, didClick: true, didConvert: false, tenantId: tenant.id },
      { query: 'cyberpunk top', source: 'visual', resultCount: 0, latencyMs: 320, didClick: false, didConvert: false, tenantId: tenant.id },
    ],
  });

  // 9. Create Mock Subscription
  console.log('Creating Demo Subscription...');
  await prisma.tenantSubscription.create({
    data: {
      tenantId: tenant.id,
      planCode: 'pro',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  console.log('\n==================================================');
  console.log('✅ Demo Sandbox environment successfully provisioned!');
  console.log(`Subdomain:   ${demoSubdomain}`);
  console.log(`Admin User:  ${user.email}`);
  console.log('==================================================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
