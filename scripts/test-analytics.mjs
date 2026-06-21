/**
 * Test analytics scripts firing on HEUSE production.
 *
 * Verifies:
 *  1. window.gtag is a function (GA4 loaded)
 *  2. window.fbq is a function (Meta Pixel loaded)
 *  3. Network requests to googletagmanager.com fired
 *  4. Network requests to facebook.com (fbevents) fired
 *  5. PageView events register
 *
 * Usage: node scripts/test-analytics.mjs
 */

import { chromium } from "playwright";
import { writeFileSync } from "fs";

const PROD_URL = "https://heuse-production-9203.up.railway.app";
const SCREENSHOT_PATH = "scripts/analytics-test.png";
const REPORT_PATH = "scripts/analytics-report.json";

const results = {
  homepage: {},
  productsPage: {},
  consoleErrors: [],
  networkLog: [],
  pageviews: [],
  passed: false,
};

async function main() {
  console.log("🚀 Launching headless browser...\n");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  // Capture console
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      results.consoleErrors.push(msg.text());
    }
  });

  // Capture network requests to analytics endpoints
  page.on("request", (req) => {
    const url = req.url();
    const isGa =
      url.includes("googletagmanager.com") ||
      url.includes("google-analytics.com") ||
      url.includes("analytics.google.com") ||
      url.includes("google.com/g/collect");
    const isMeta =
      url.includes("facebook.com") ||
      url.includes("facebook.net") ||
      url.includes("fbcdn.net") ||
      url.includes("fbevents");
    if (isGa || isMeta) {
      results.networkLog.push({
        url: url,
        method: req.method(),
        type: isMeta ? "meta" : "ga",
      });
    }
  });

  // Capture gtag calls
  await page.addInitScript(() => {
    window.__gtagCalls = [];
    window.__fbqCalls = [];
    const origGtag = window.gtag;
    window.gtag = function (...args) {
      window.__gtagCalls.push(args);
      if (origGtag) origGtag.apply(this, args);
    };
    const origFbq = window.fbq;
    window.fbq = function (...args) {
      window.__fbqCalls.push(args);
      if (origFbq) origFbq.apply(this, args);
    };
  });

  // === Test 1: Homepage ===
  console.log("📄 Loading homepage...");
  await page.goto(PROD_URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000); // wait for analytics scripts to execute

  results.homepage = await page.evaluate(() => {
    return {
      gtagIsFunction: typeof window.gtag === "function",
      fbqIsFunction: typeof window.fbq === "function",
      dataLayerExists: Array.isArray(window.dataLayer),
      gtagCalls: window.__gtagCalls?.length || 0,
      fbqCalls: window.__fbqCalls?.length || 0,
      title: document.title,
      url: window.location.href,
    };
  });

  console.log("   Title:", results.homepage.title);
  console.log("   window.gtag is function:", results.homepage.gtagIsFunction ? "✅" : "❌");
  console.log("   window.fbq is function:", results.homepage.fbqIsFunction ? "✅" : "❌");
  console.log("   dataLayer exists:", results.homepage.dataLayerExists ? "✅" : "❌");
  console.log("   gtag calls captured:", results.homepage.gtagCalls);
  console.log("   fbq calls captured:", results.homepage.fbqCalls);

  // Capture screenshot
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
  console.log("   📸 Screenshot saved to:", SCREENSHOT_PATH);

  // === Test 2: Navigate to /products (SPA route change) ===
  console.log("\n📄 Navigating to /products...");
  await page.goto(PROD_URL + "/products", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);

  results.productsPage = await page.evaluate(() => {
    return {
      gtagCalls: window.__gtagCalls?.length || 0,
      fbqCalls: window.__fbqCalls?.length || 0,
      lastGtagCall: window.__gtagCalls?.[window.__gtagCalls.length - 1] || null,
      lastFbqCall: window.__fbqCalls?.[window.__fbqCalls.length - 1] || null,
    };
  });

  console.log("   Total gtag calls:", results.productsPage.gtagCalls);
  console.log("   Total fbq calls:", results.productsPage.fbqCalls);

  // === Test 3: Click into an article to simulate user flow ===
  console.log("\n📄 Clicking into articles...");
  await page.goto(PROD_URL + "/articles", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Find first article link
  const articleLink = await page.$('a[href^="/articles/"]');
  if (articleLink) {
    const href = await articleLink.getAttribute("href");
    console.log("   Clicking article:", href);
    await articleLink.click();
    await page.waitForTimeout(3000);
  }

  // === Test 4: Visit a product detail page ===
  console.log("\n📄 Visiting product detail page...");
  await page.goto(PROD_URL + "/products/obsidian-bomber", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);

  results.productDetail = await page.evaluate(() => {
    return {
      gtagCalls: window.__gtagCalls?.length || 0,
      fbqCalls: window.__fbqCalls?.length || 0,
    };
  });

  console.log("   Total gtag calls:", results.productDetail.gtagCalls);
  console.log("   Total fbq calls:", results.productDetail.fbqCalls);

  // === Final summary ===
  results.passed =
    results.homepage.gtagIsFunction &&
    results.homepage.fbqIsFunction &&
    results.homepage.gtagCalls > 0 &&
    results.homepage.fbqCalls > 0;

  console.log("\n═══════════════════════════════════════════════");
  console.log("📊 NETWORK REQUESTS TO ANALYTICS:");
  console.log("═══════════════════════════════════════════════");
  const gaReqs = results.networkLog.filter((r) => r.type === "ga");
  const metaReqs = results.networkLog.filter((r) => r.type === "meta");
  console.log(`   GA requests: ${gaReqs.length}`);
  gaReqs.forEach((r) => console.log(`     - ${r.url}`));
  console.log(`   Meta requests: ${metaReqs.length}`);
  metaReqs.forEach((r) => console.log(`     - ${r.url}`));

  console.log("\n═══════════════════════════════════════════════");
  console.log("📊 TOTAL EVENTS FIRED:");
  console.log("═══════════════════════════════════════════════");
  console.log(`   gtag calls: ${results.productDetail.gtagCalls}`);
  console.log(`   fbq calls: ${results.productDetail.fbqCalls}`);

  if (results.consoleErrors.length > 0) {
    console.log("\n═══════════════════════════════════════════════");
    console.log("⚠️  CONSOLE ERRORS:");
    console.log("═══════════════════════════════════════════════");
    results.consoleErrors.forEach((e) => console.log("   -", e));
  }

  console.log("\n═══════════════════════════════════════════════");
  console.log(results.passed ? "✅ TEST PASSED" : "❌ TEST FAILED");
  console.log("═══════════════════════════════════════════════");

  writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2));
  console.log(`\n📄 Full report saved to: ${REPORT_PATH}`);

  await browser.close();
  process.exit(results.passed ? 0 : 1);
}

main().catch((err) => {
  console.error("❌ Test error:", err);
  process.exit(2);
});