import { chromium } from "playwright";

const BASE = process.env.SMOKE_URL || "http://127.0.0.1:5173/login";
const USER = process.env.SMOKE_USER || "admin";
const PASS = process.env.SMOKE_PASS;

if (!PASS) {
  console.error("SMOKE_PASS ortam değişkeni gerekli (ör. export SMOKE_PASS=...)");
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`PAGE: ${e.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`CON: ${msg.text()}`);
});

await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
await page.locator("#login input[type='text']").fill(USER);
await page.locator("#login input[type='password']").fill(PASS);
await page.locator("#login button.btn--accent").click();
await page.waitForURL(/\/(dashboard)?$/, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(5000);

const url = page.url();
const text = await page.locator("#root").innerText().catch(() => "");

console.log("URL:", url);
console.log("TEXT:", text.slice(0, 400));
console.log("ERRORS:", JSON.stringify(errors, null, 2));

await browser.close();
const ok = text.includes("Genel") || text.includes("Toplam") || text.includes("Pozisyon");
process.exit(ok ? 0 : 1);
