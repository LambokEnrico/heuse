import type { NextConfig } from "next";

/**
 * Security headers applied to all routes.
 * Helmet-equivalent for Next.js App Router.
 *
 * CSP notes:
 * - PayPal SDK loads from www.paypal.com / *.paypal.com
 * - Connect-src must allow PayPal API endpoints (sandbox + live)
 * - Frame-src allows PayPal checkout iframe
 * - Production: NO 'unsafe-eval' (XSS hardening)
 *   'unsafe-inline' for scripts is still needed by Next.js for now
 *   (planned: nonce-based CSP in Next.js 16.1+)
 * - Development: relaxed CSP for Turbopack HMR (eval + ws: required)
 */
const isDev = process.env.NODE_ENV !== "production";

const cspHeader = [
  "default-src 'self'",
  // Scripts: production = no eval, dev = allow HMR
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.paypal.com https://*.paypalobjects.com https://*.paypal.com https://challenges.cloudflare.com"
    : "script-src 'self' 'unsafe-inline' https://www.paypal.com https://*.paypalobjects.com https://*.paypal.com https://challenges.cloudflare.com",
  // Styles: 'unsafe-inline' required by some UI libraries (Radix portals)
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  // PayPal API + UploadThing API (incl. regional ingest endpoints like
  // sea1.ingest.uploadthing.com + utfs.io CDN). Dev: ws:/wss: for HMR WebSocket.
  // force-rebuild marker: 1781628705
  isDev
    ? "connect-src 'self' https://api-m.sandbox.paypal.com https://api-m.paypal.com https://*.paypal.com https://api.uploadthing.com https://*.ingest.uploadthing.com https://utfs.io ws: wss:"
    : "connect-src 'self' https://api-m.sandbox.paypal.com https://api-m.paypal.com https://*.paypal.com https://api.uploadthing.com https://*.ingest.uploadthing.com https://utfs.io",
  "frame-src 'self' https://www.paypal.com https://*.paypal.com https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // Railway: standalone output produces a smaller, self-contained server
  // DISABLED: causes static files 404 because Railway serves from root, not standalone/
  // output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "uploadthing.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Prevent clickjacking (legacy + CSP frame-ancestors)
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Limit referrer info
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Restrict browser features we don't use
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Force HTTPS (only effective when served over HTTPS, harmless on localhost)
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // XSS protection (legacy, modern browsers don't need but defense in depth)
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Main CSP
          { key: "Content-Security-Policy", value: cspHeader },
        ],
      },
      // PayPal webhook endpoint needs to be reachable from PayPal's servers
      // (no extra headers needed; PayPal uses signature verification, not CSP)
    ];
  },
};

export default nextConfig;
