import type { MetadataRoute } from "next";

/**
 * /robots.txt — controls crawler access.
 *
 * Allows:
 *   - All public pages (homepage, products, drops, articles, etc.)
 *
 * Disallows:
 *   - /admin (CMS, never index)
 *   - /api (server endpoints, never index)
 *   - /account (private user area)
 *   - /login, /register (auth flows)
 *   - /checkout, /cart (transactional, no SEO value)
 *
 * Sitemap location is referenced so crawlers can discover it.
 */

export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api",
          "/account",
          "/login",
          "/register",
          "/checkout",
          "/cart",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

// Robots.txt rarely changes — serve from build cache.
export const dynamic = "force-static";