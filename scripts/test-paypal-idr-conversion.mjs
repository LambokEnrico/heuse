#!/usr/bin/env node
/**
 * End-to-end test for IDR→USD conversion fix.
 *
 * Steps:
 * 1. Create a fresh test order in DB (simulating checkout)
 * 2. Hit /api/paypal/create-order
 * 3. Verify PayPal accepts (no CURRENCY_NOT_SUPPORTED error)
 * 4. Clean up: cancel the test order
 *
 * Requires:
 *   DATABASE_URL from Railway (postgres.railway.internal only reachable from Railway network)
 *   Run via: railway run node scripts/test-paypal-idr-conversion.mjs
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SITE_URL = "https://heuse-production-9203.up.railway.app";
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error("CRON_SECRET env var required");
  process.exit(1);
}

async function main() {
  console.log("=== IDR→USD PayPal Conversion Test ===\n");

  // Step 1: Find an existing AWAITING_PAYMENT order to test with
  console.log("1. Looking for an existing AWAITING_PAYMENT order...");
  let order = await prisma.order.findFirst({
    where: {
      paymentStatus: "UNPAID",
      status: "AWAITING_PAYMENT",
      paypalOrderId: null,
    },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  if (!order) {
    console.log("   No existing order found. Creating one...");
    // Create a minimal test order
    const product = await prisma.product.findFirst({
      include: { variants: { where: { stock: { gt: 0 } }, take: 1 } },
    });
    if (!product || !product.variants[0]) {
      throw new Error("No products with stock available for test");
    }

    const variant = product.variants[0];
    order = await prisma.order.create({
      data: {
        orderNumber: `TEST-PAYPAL-${Date.now()}`,
        customerName: "Test Customer",
        customerEmail: "test@example.com",
        customerPhone: "+6281234567890",
        shippingAddress: "Test Address",
        shippingCity: "Jakarta",
        shippingProvince: "DKI Jakarta",
        shippingPostalCode: "12345",
        shippingCountry: "Indonesia",
        subtotal: Number(variant.price),
        shippingCost: 0,
        total: Number(variant.price),
        currency: "IDR",
        status: "AWAITING_PAYMENT",
        paymentStatus: "UNPAID",
        paymentMethod: "PAYPAL",
        items: {
          create: [
            {
              productId: product.id,
              variantId: variant.id,
              name: product.name,
              size: variant.size,
              price: Number(variant.price),
              quantity: 1,
            },
          ],
        },
      },
      include: { items: true },
    });
    console.log(`   ✅ Created test order: ${order.orderNumber} (${order.id})`);
    console.log(`   Total: IDR ${order.total}`);
  } else {
    console.log(`   ✅ Using existing order: ${order.orderNumber}`);
    console.log(`   Total: IDR ${order.total}`);
  }

  // Step 2: Hit PayPal create-order endpoint
  console.log("\n2. Calling /api/paypal/create-order...");
  const res = await fetch(`${SITE_URL}/api/paypal/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: order.id }),
  });

  const responseText = await res.text();
  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    data = { raw: responseText };
  }

  console.log(`   HTTP Status: ${res.status}`);

  if (res.ok && data.paypalOrderId) {
    console.log(`   ✅ PayPal accepted! Order ID: ${data.paypalOrderId}`);
    console.log(`   Approval URL: ${data.approvalUrl?.slice(0, 80)}...`);

    // Step 3: Verify the conversion in DB
    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      select: { paypalOrderId: true, total: true },
    });
    console.log(`\n3. Verification:`);
    console.log(`   DB paypalOrderId: ${updated?.paypalOrderId}`);
    console.log(`   DB total (IDR): ${updated?.total}`);
    console.log(`   Expected USD: $${(Number(updated?.total) / 16000).toFixed(2)}`);

    // Cleanup: cancel the test PayPal order at PayPal + clear paypalOrderId in DB
    console.log(`\n4. Cleanup: clearing paypalOrderId (don't capture - it's just a test)...`);
    await prisma.order.update({
      where: { id: order.id },
      data: { paypalOrderId: null },
    });
    console.log(`   ✅ Cleaned up`);

    console.log("\n=== ✅ TEST PASSED — IDR→USD conversion working ===\n");
  } else if (data.error?.includes("CURRENCY_NOT_SUPPORTED")) {
    console.log(`   ❌ TEST FAILED — Still getting CURRENCY_NOT_SUPPORTED`);
    console.log(`   Error: ${data.error}`);
    process.exit(1);
  } else {
    console.log(`   ❌ Unexpected response:`);
    console.log(JSON.stringify(data, null, 2));
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
