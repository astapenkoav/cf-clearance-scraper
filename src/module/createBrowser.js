const { connect } = require("puppeteer-real-browser")
const StealthPlugin = require("puppeteer-extra-plugin-stealth")

async function createBrowser() {
    try {
        if (global.finished == true) return

        global.browser = null

        // console.log('Launching the browser...');

        const stealth = StealthPlugin()
        // puppeteer-real-browser already handles iframe.contentWindow and user-agent override
        // via rebrowser. Disabling those evasions avoids double-patching conflicts.
        stealth.enabledEvasions.delete("iframe.contentWindow")
        stealth.enabledEvasions.delete("user-agent-override")

        const { browser } = await connect({
            headless: false,
            turnstile: true,
            connectOption: { defaultViewport: null },
            disableXvfb: false,
            plugins: [stealth],
        })

        // console.log('Browser launched');

        global.browser = browser;

        browser.on('disconnected', async () => {
            if (global.finished == true) return
            console.log('Browser disconnected');
            await new Promise(resolve => setTimeout(resolve, 3000));
            await createBrowser();
        })

    } catch (e) {
        console.log(e.message);
        if (global.finished == true) return
        await new Promise(resolve => setTimeout(resolve, 3000));
        await createBrowser();
    }
}
createBrowser()