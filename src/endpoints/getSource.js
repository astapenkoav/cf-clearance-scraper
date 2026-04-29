const { applyFingerprint } = require("../module/fingerprint");

function getSource({ url, proxy, waitForMs, waitForSelector, waitForSelectorTimeout, cookies }) {
  return new Promise(async (resolve, reject) => {
    if (!url) return reject("Missing url parameter");

    // Wait up to waitForMs for async JS (AJAX verdicts, fingerprint scripts)
    // to finish updating the DOM before snapshot. Capped at 30s to avoid runaway.
    const extraWait = Math.min(Number(waitForMs) || 0, 30000);
    // waitForSelector: wait for a CSS selector to appear in DOM before snapshot.
    // waitForSelectorTimeout: max ms to wait for selector (default 30000, max 60000).
    const selectorToWait = waitForSelector || null;
    const selectorTimeout = Math.min(Number(waitForSelectorTimeout) || 30000, 60000);
    const context = await global.browser
      .createBrowserContext({
        proxyServer: proxy ? `http://${proxy.host}:${proxy.port}` : undefined, // https://pptr.dev/api/puppeteer.browsercontextoptions
      })
      .catch(() => null);
    if (!context) return reject("Failed to create browser context");

    let isResolved = false;

    var cl = setTimeout(async () => {
      if (!isResolved) {
        await context.close();
        reject("Timeout Error");
      }
    }, global.timeOut || 60000);

    try {
      const page = await context.newPage();

      // Randomize viewport + Accept-Language per request
      await applyFingerprint(page);

      // Set cookies if provided
      if (cookies && Array.isArray(cookies) && cookies.length > 0) {
        await page.setCookie(...cookies);
      }

      if (proxy?.username && proxy?.password)
        await page.authenticate({
          username: proxy.username,
          password: proxy.password,
        });

      await page.setRequestInterception(true);
      page.on("request", async (request) => request.continue());
      page.on("response", async (res) => {
        try {
          if (
            [200, 302].includes(res.status()) &&
            [url, url + "/"].includes(res.url())
          ) {
            await page
              .waitForNavigation({ waitUntil: "load", timeout: 5000 })
              .catch(() => {});
            if (selectorToWait) {
              // Wait for specific selector to appear (SPA content, lazy-loaded elements)
              await page
                .waitForSelector(selectorToWait, { timeout: selectorTimeout })
                .catch(() => {});
            } else if (extraWait > 0) {
              await new Promise((r) => setTimeout(r, extraWait));
            }
            const html = await page.content();
            await context.close();
            isResolved = true;
            clearInterval(cl);
            resolve(html);
          }
        } catch (e) {}
      });
      await page.goto(url, {
        waitUntil: "domcontentloaded",
      });
    } catch (e) {
      if (!isResolved) {
        await context.close();
        clearInterval(cl);
        reject(e.message);
      }
    }
  });
}
module.exports = getSource;
