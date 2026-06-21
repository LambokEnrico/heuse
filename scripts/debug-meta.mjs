import { chromium } from "playwright";

const PROD_URL = "https://heuse-production-9203.up.railway.app";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const allRequests = [];
page.on("request", (req) => {
  allRequests.push({ url: req.url(), method: req.method() });
});

const consoleMsgs = [];
page.on("console", (msg) => {
  consoleMsgs.push(`[${msg.type()}] ${msg.text()}`);
});

await page.goto(PROD_URL, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(8000); // wait longer

// Check fbevents.js scripts in DOM
const scripts = await page.evaluate(() => {
  const list = [];
  document.querySelectorAll("script").forEach((s) => {
    list.push({
      src: s.src,
      type: s.type,
      hasContent: s.innerHTML.length > 0,
      contentPreview: s.innerHTML.substring(0, 100),
    });
  });
  return list;
});

console.log("=== Scripts in DOM ===");
scripts.forEach((s, i) => console.log(`  [${i}] src=${s.src || "(inline)"} contentLen=${s.contentPreview ? s.contentPreview.length : 0}`));

console.log("\n=== fbevents.js requests ===");
const fbReqs = allRequests.filter((r) => r.url.includes("fbevents") || r.url.includes("facebook"));
fbReqs.forEach((r) => console.log(`  ${r.method} ${r.url}`));

console.log("\n=== All non-localhost requests ===");
allRequests
  .filter((r) => !r.url.includes("localhost") && !r.url.includes("127.0.0.1") && !r.url.includes("heuse-production"))
  .slice(0, 30)
  .forEach((r) => console.log(`  ${r.method} ${r.url}`));

console.log("\n=== Console messages ===");
consoleMsgs.slice(0, 30).forEach((m) => console.log("  " + m));

console.log("\n=== window.fbq queue ===");
const fbqState = await page.evaluate(() => {
  return {
    fbqIsFunction: typeof window.fbq === "function",
    fbqQueueLength: window.fbq?.queue?.length ?? window._fbq?.queue?.length ?? "n/a",
    fbqLoaded: window.fbq?.loaded ?? "n/a",
  };
});
console.log(JSON.stringify(fbqState, null, 2));

await browser.close();