import { chromium } from "playwright";
import readline from "readline";
import fs from "fs";


// ---------- USER INPUT ----------
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(q) {
  return new Promise((resolve) => rl.question(q, resolve));
}

// ---------- ROTATION DATA ----------
const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36",
];

const viewports = [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
];

const locales = ["en-US", "en-IN", "en-GB"];
const timezones = ["Asia/Kolkata", "Asia/Dubai", "Europe/London"];

// ---------- CAPTCHA DETECTOR ----------
async function isCaptchaPresent(page) {
  const iframeCount = await page.locator('iframe[src*="recaptcha"]').count();
  const textCount = await page.locator(
    'text=/unusual traffic|verify you are human|captcha/i'
  ).count();
  return iframeCount > 0 || textCount > 0;
}

async function waitIfCaptcha(page) {
  if (await isCaptchaPresent(page)) {
    console.log("⚠️ CAPTCHA detected — solve manually");
    await page.waitForTimeout(30000);
  }
}

// ---------- HUMAN TYPE ----------
async function humanType(page, selector, text) {
  const input = page.locator(selector);
  await input.focus();

  for (const char of text) {
    await page.keyboard.type(char, {
      delay: Math.random() * 150 + 60,
    });
    if (char === " ") await page.waitForTimeout(600);
  }
}

// ---------- SCROLL ----------
async function smartScroll(page) {
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.8));
    await page.waitForTimeout(2500);
  }
}

// ---------- AIRBNB "GOT IT" POPUP ----------
async function closeAirbnbGotItPopup(page) {
  try {
    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor({ timeout: 7000 });

    const gotItBtn = dialog.locator('button:has-text("Got it")');
    if (await gotItBtn.count()) {
      await gotItBtn.first().click({ force: true });
      console.log("✅ Airbnb 'Got it' popup closed");
      await page.waitForTimeout(1500);
    }
  } catch {
    console.log("ℹ️ Airbnb popup not shown");
  }
}

// ================= MAIN =================
(async () => {
  const searchText = await askQuestion("What would you want to search? 👉 ");
  rl.close();

  const browser = await chromium.launch({
    headless: false,
    slowMo: 60,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.newContext({
    userAgent: userAgents[Math.floor(Math.random() * userAgents.length)],
    viewport: viewports[Math.floor(Math.random() * viewports.length)],
    locale: locales[Math.floor(Math.random() * locales.length)],
    timezoneId: timezones[Math.floor(Math.random() * timezones.length)],
  });

  await context.clearCookies();
  await context.clearPermissions();

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });
  });

  const page = await context.newPage();

  // ---------- GOOGLE ----------
  console.log("🔍 Opening Google...");
  await page.goto("https://www.google.com", { waitUntil: "domcontentloaded" });
  await waitIfCaptcha(page);

  try {
    await page.click("button:has-text('Accept'), button:has-text('I agree')", {
      timeout: 5000,
    });
  } catch {}

  const searchSelector = "textarea[name='q'], input[name='q']";
  await page.waitForSelector(searchSelector);
  await humanType(page, searchSelector, searchText);
  await page.keyboard.press("Enter");

  await waitIfCaptcha(page);

  // ---------- FIRST ORGANIC RESULT ----------
  await page.waitForSelector("div#search a h3", { timeout: 30000 });
  const firstResult = page.locator("div#search a:has(h3)").first();

  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    firstResult.click(),
  ]);

  await waitIfCaptcha(page);

  // ---------- FORCE AIRBNB SEARCH PAGE ----------
  if (!(await page.locator("a[href*='/rooms/']").count())) {
    const location = searchText.replace(/airbnb|in/gi, "").trim();
    await page.goto(
      `https://www.airbnb.com/s/${encodeURIComponent(location)}/homes`,
      { waitUntil: "domcontentloaded" }
    );
    await waitIfCaptcha(page);
  }

  // ---------- CLOSE POPUP BEFORE EXTRACTION ----------
  await closeAirbnbGotItPopup(page);

  // ---------- SCROLL ----------
  await smartScroll(page);

  // ---------- EXTRACT AFTER POPUP ----------
 // ---------- EXTRACT AFTER POPUP ----------
await page.waitForSelector('div[itemprop="itemListElement"]', { timeout: 20000 });

const data = await page.evaluate(() => {
  const results = [];
  const seen = new Set();

  const cards = document.querySelectorAll('div[itemprop="itemListElement"]');

  for (const card of cards) {
    if (results.length >= 4) break;

    const linkEl = card.querySelector('a[href*="/rooms/"]');
    if (!linkEl) continue;

    const link = linkEl.href;
    const roomId = link.match(/rooms\/(\d+)/)?.[1];
    if (!roomId || seen.has(roomId)) continue;
    seen.add(roomId);

    // TITLE
    const title =
      card.querySelector('meta[itemprop="name"]')?.content ||
      card.querySelector("h2, h3")?.innerText ||
      "N/A";

    // DESCRIPTION
    const description =
      card.querySelector('[itemprop="description"]')?.content ||
      card.querySelector('div[role="group"]')?.innerText ||
      "N/A";

    // PRICE
    let price = null;
    const priceText =
      card.innerText.match(/₹\s?[\d,]+|\$\s?[\d,]+|€\s?[\d,]+/)?.[0];
    if (priceText) price = priceText;

    // RATING
    let rating = null;
    const ratingText = card.querySelector('[aria-label*="rating"], [aria-label*="stars"]')?.getAttribute("aria-label") ||
                       card.querySelector('span[aria-hidden="true"]')?.innerText;
    if (ratingText) {
      const match = ratingText.match(/[\d.]+/);
      if (match) rating = match[0];
    }

    results.push({
      title,
      description,
      price,
      rating,
      link,
    });
  }

  return results;
});


console.log("✅ Data successfully saved to output.json");


  console.log("\n📦 FINAL JSON OUTPUT\n");
  console.log(JSON.stringify(data, null, 2));
  fs.writeFileSync(
  "output.json",
  JSON.stringify(data, null, 2),
  "utf-8"
);

console.log("✅ Data successfully saved to output.json");


  await browser.close();
})();
