import { chromium } from "playwright";
import readline from "readline";

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
  const textCount = await page.locator('text=/unusual traffic/i').count();
  return iframeCount > 0 || textCount > 0;
}

async function waitIfCaptcha(page) {
  if (await isCaptchaPresent(page)) {
    console.log("⚠️ CAPTCHA detected — solve manually");
    await page.waitForTimeout(25000);
  }
}

// ---------- HUMAN TYPE ----------
async function humanType(page, selector, text) {
  const input = page.locator(selector);
  await input.focus();

  for (const char of text) {
    await page.keyboard.type(char, { delay: Math.random() * 120 + 80 });
    if (char === " ") await page.waitForTimeout(500);
  }
}

// ---------- AIRBNB SCROLL ----------
async function airbnbScroll(page) {
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await page.waitForTimeout(3000);
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

  const page = await context.newPage();

  console.log("🔍 Opening Google...");
  await page.goto("https://www.google.com", { waitUntil: "domcontentloaded" });
  await waitIfCaptcha(page);

  try {
    await page.click(
      "button:has-text('Accept all'), button:has-text('I agree')",
      { timeout: 5000 }
    );
  } catch {}

  const searchBox = "textarea[name='q'], input[name='q']";
  await page.waitForSelector(searchBox);
  await humanType(page, searchBox, searchText);
  await page.keyboard.press("Enter");

  await page.waitForSelector("div#search a h3", { timeout: 30000 });

  // ---------- FIRST ORGANIC RESULT ----------
  const firstResult = page.locator("div#search a:has(h3)").first();
  const targetUrl = await firstResult.getAttribute("href");

  console.log("🔗 Clicking:", targetUrl);

  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    firstResult.click(),
  ]);

  await waitIfCaptcha(page);

  // ---------- FORCE AIRBNB SEARCH PAGE ----------
  const hasSearchUI = await page
    .locator("input[placeholder*='Search destinations']")
    .count();

  if (!hasSearchUI) {
    const location = searchText.replace(/airbnb|in/gi, "").trim();
    console.log("🔁 Redirecting to Airbnb search page:", location);

    await page.goto(
      `https://www.airbnb.com/s/${encodeURIComponent(location)}/homes`,
      { waitUntil: "domcontentloaded" }
    );
    await waitIfCaptcha(page);
  }

  // ---------- SCROLL AIRBNB ----------
  await airbnbScroll(page);

  // ---------- EXTRACT FIRST 4 LISTINGS ----------
  const listings = await page.evaluate(() => {
    const results = [];
    const cards = document.querySelectorAll("div[itemprop='itemListElement']");

    for (const card of cards) {
      if (results.length >= 4) break;

      const link = card.querySelector("a")?.href || null;
      const title = card.querySelector("h3")?.innerText || null;
      const price =
        card.innerText.match(/₹\s?[\d,]+|\$\s?[\d,]+/i)?.[0] || null;
      const rating =
        card.innerText.match(/\b\d\.\d{1,2}\b/)?.[0] || null;

      const description =
        card.innerText.split("\n").slice(1, 3).join(" ") || null;

      if (link && title) {
        results.push({
          title,
          description,
          price,
          rating,
          link,
        });
      }
    }
    return results;
  });

  console.log("\n📦 FINAL JSON OUTPUT\n");
  console.log(JSON.stringify(listings, null, 2));

  await browser.close();
})();
