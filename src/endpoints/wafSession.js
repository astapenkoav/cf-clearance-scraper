// Static Accept-Language matching common US English browser profile.
// Previously this was fetched from httpbin.org which added third-party dependency
// and leaked bot-like behavior (extra request to a testing service on startup).
const DEFAULT_ACCEPT_LANGUAGE = "en-US,en;q=0.9";

const { applyFingerprint } = require("../module/fingerprint");

function getSource({ url, proxy }) {
  return new Promise(async (resolve, reject) => {
    if (!url) return reject("Missing url parameter");
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
      const fp = await applyFingerprint(page);

      if (proxy?.username && proxy?.password)
        await page.authenticate({
          username: proxy.username,
          password: proxy.password,
        });
      let acceptLanguage = fp.locale;
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
            const cookies = await page.cookies();
            let headers = await res.request().headers();
            delete headers["content-type"];
            delete headers["accept-encoding"];
            delete headers["accept"];
            delete headers["content-length"];
            headers["accept-language"] = acceptLanguage;
            await context.close();
            isResolved = true;
            clearInterval(cl);
            resolve({ cookies, headers });
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
