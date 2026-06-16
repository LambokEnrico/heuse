import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcrypt";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL not set");

// PostgreSQL only — schema.prisma hardcodes provider = "postgresql"
// (SQLite adapter code path removed: schema doesn't support it)
const adapter = new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter });

/**
 * Idempotent seed — safe to re-run.
 * - Categories: upsert by slug
 * - Drops: upsert by slug
 * - Products: upsert by slug (images + variants recreated)
 * - Admin user: upsert by email (password re-hashed if changed)
 */
async function main() {
  console.log("🌱 Seeding database...");

  // =================================================================
  // 1. Admin user (from env vars)
  // =================================================================
  const adminEmail = process.env.ADMIN_SEED_EMAIL;
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error(
      "ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be set in .env"
    );
  }
  const passwordHash = await hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, role: "OWNER" },
    create: {
      email: adminEmail,
      name: "Admin",
      role: "OWNER",
      passwordHash,
    },
  });
  console.log(`  ✓ Admin user: ${admin.email} (role: ${admin.role})`);

  // =================================================================
  // 2. Categories
  // =================================================================
  const category = await prisma.category.upsert({
    where: { slug: "jackets" },
    update: {},
    create: { name: "Jackets", slug: "jackets" },
  });

  // =================================================================
  // 3. Drop
  // =================================================================
  const drop = await prisma.drop.upsert({
    where: { slug: "midnight-collection" },
    update: {},
    create: {
      name: "Midnight Collection",
      slug: "midnight-collection",
      description: "Limited edition jacquard jackets for the bold.",
      published: true,
    },
  });

  // =================================================================
  // 4. Products
  // =================================================================
  const products = [
    {
      name: "Obsidian Bomber",
      slug: "obsidian-bomber",
      sku: "HB-001",
      shortDescription: "Black jacquard bomber with gold threading",
      description: "Handcrafted jacquard bomber jacket with intricate gold threading patterns.",
      price: 2850000,
      categoryId: category.id,
      dropId: drop.id,
      editionLimit: 20,
      status: "PUBLISHED" as const,
      featured: true,
    },
    {
      name: "Onyx Varsity",
      slug: "onyx-varsity",
      sku: "HB-002",
      shortDescription: "Classic varsity silhouette in premium jacquard",
      description: "Modern varsity jacket reimagined in luxurious jacquard fabric.",
      price: 2450000,
      categoryId: category.id,
      dropId: drop.id,
      editionLimit: 15,
      status: "PUBLISHED" as const,
      featured: true,
    },
    {
      name: "Charcoal Runner",
      slug: "charcoal-runner",
      sku: "HB-003",
      shortDescription: "Lightweight jacquard runner jacket",
      description: "Perfect for layering, features subtle tonal jacquard pattern.",
      price: 1950000,
      categoryId: category.id,
      dropId: drop.id,
      editionLimit: 25,
      status: "PUBLISHED" as const,
      featured: true,
    },
  ];

  for (const productData of products) {
    const product = await prisma.product.upsert({
      where: { slug: productData.slug },
      update: productData,
      create: productData,
    });

    // Reset images: delete and recreate (idempotent)
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80",
        alt: product.name,
        sortOrder: 0,
      },
    });

    // Reset variants: delete and recreate (idempotent)
    await prisma.productVariant.deleteMany({ where: { productId: product.id } });
    for (const size of ["S", "M", "L", "XL"]) {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          size,
          stock: Math.floor(Math.random() * 5) + 1,
        },
      });
    }

    console.log(`  ✓ Product: ${product.name}`);
  }

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
