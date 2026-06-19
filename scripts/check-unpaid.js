// Check state of UNPAID orders and stuck stock
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const p = new PrismaClient({ adapter });

(async () => {
  const orders = await p.order.findMany({
    where: {
      paymentStatus: 'UNPAID',
      status: { in: ['AWAITING_PAYMENT', 'CANCELLED'] }
    },
    include: {
      items: { include: { variant: { include: { product: true } } } }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`UNPAID orders (AWAITING_PAYMENT or CANCELLED): ${orders.length}`);
  console.log('---');

  for (const o of orders) {
    console.log(`\n[${o.orderNumber}] status=${o.status} paymentStatus=${o.paymentStatus}`);
    console.log(`  customer: ${o.customerName} (${o.customerEmail})`);
    console.log(`  total: ${o.total} ${o.currency}`);
    console.log(`  created: ${o.createdAt.toISOString()}`);
    console.log(`  items:`);
    for (const i of o.items) {
      console.log(`    - ${i.variant.product.name} | ${i.variant.size}/${i.variant.color} | qty=${i.quantity}`);
    }
  }

  console.log('\n=== Variant stock check ===');
  const variantIds = new Set();
  orders.forEach(o => o.items.forEach(i => variantIds.add(i.variantId)));

  for (const vid of variantIds) {
    const v = await p.productVariant.findUnique({
      where: { id: vid },
      include: { product: true }
    });
    console.log(`  ${v.product.name} | ${v.size}/${v.color} | stock=${v.stock} | reserved=${v.reserved}`);
  }

  await p.$disconnect();
})().catch(err => { console.error(err); process.exit(1); });
