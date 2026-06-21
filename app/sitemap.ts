import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

/**
 * Dynamic sitemap.xml — generated on-demand from DB.
 *
 * Includes:
 *   - Static public routes (homepage, products, drops, articles, etc.)
 *   - All PUBLISHED products
 *   - All PUBLISHED drops
 *   - All PUBLISHED articles
 *
 * Discovered by crawlers via /robots.txt → /sitemap.xml.
 *
 * Base URL: NEXT_PUBLIC_SITE_URL (production) or localhost (dev).
 */

const STATIC_ROUTES = [
  { path: "", priority: 1.0, changeFrequency: "weekly" as const },
  { path: "/products", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/drops", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/articles", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/contact", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/faq", priority: 0.5, changeFrequency: "monthly" as const },
];

// Force on-demand rendering: Next.js would otherwise try to prerender
// /sitemap.xml at build time, which fails without a live DB connection.
export const dynamic = "force-dynamic";
export const revalidate = 3600; // 1 hour cache

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  const now = new Date();

  // Static routes
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Dynamic: published products
  const products = await prisma.product.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
  });

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}/products/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Dynamic: published drops
  let dropEntries: MetadataRoute.Sitemap = [];
  try {
    const drops = await prisma.drop.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    });
    dropEntries = drops.map((d) => ({
      url: `${base}/drops/${d.slug}`,
      lastModified: d.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // Drop model might not have `published` field — skip silently
  }

  // Dynamic: published articles
  let articleEntries: MetadataRoute.Sitemap = [];
  try {
    const articles = await prisma.article.findMany({
      where: { published: true },
      select: { slug: true, publishedAt: true, updatedAt: true },
    });
    articleEntries = articles.map((a) => ({
      url: `${base}/articles/${a.slug}`,
      lastModified: a.publishedAt || a.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // Skip if model/field missing
  }

  return [
    ...staticEntries,
    ...productEntries,
    ...dropEntries,
    ...articleEntries,
  ];
}