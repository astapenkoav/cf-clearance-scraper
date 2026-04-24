// Fingerprint randomization helpers for page setup.
// Picks a realistic viewport + UA pair from a small pool on each call.
// Keep the pool small and current — rotate User-Agents every ~6 weeks.

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1680, height: 1050 },
];

const LOCALES = [
  "en-US,en;q=0.9",
  "en-GB,en;q=0.9",
  "en-US,en;q=0.9,de;q=0.8",
];

// Current Chrome versions on Linux/Windows/macOS (updated 2026-04).
// User-agent-override is disabled in stealth plugin (rebrowser owns it),
// so these are used only when we explicitly call setUserAgent on a page
// (currently we don't — rebrowser handles UA itself). Kept here for future use.
const USER_AGENTS = [
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickViewport() {
  return pick(VIEWPORTS);
}

function pickLocale() {
  return pick(LOCALES);
}

function pickUserAgent() {
  return pick(USER_AGENTS);
}

/**
 * Apply fingerprint randomization to a freshly-created page.
 * Called once per context before any navigation.
 */
async function applyFingerprint(page) {
  const viewport = pickViewport();
  const locale = pickLocale();

  try {
    await page.setViewport(viewport);
  } catch (e) {
    // puppeteer-real-browser may reject setViewport when defaultViewport is null.
    // Non-fatal — fall back to natural window size.
  }

  await page.setExtraHTTPHeaders({
    "Accept-Language": locale,
  });

  return { viewport, locale };
}

module.exports = {
  applyFingerprint,
  pickViewport,
  pickLocale,
  pickUserAgent,
  VIEWPORTS,
  LOCALES,
  USER_AGENTS,
};
