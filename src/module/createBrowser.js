const { connect } = require("puppeteer-real-browser")
const StealthPlugin = require("puppeteer-extra-plugin-stealth")
const path = require("path")
const fs = require("fs")

// uBlock Origin Lite extension path
const UBOL_EXTENSION_PATH = process.env.UBOL_EXTENSION_PATH ||
    path.join(process.env.HOME || "/home/openclaw", "extensions/ubol")
const CHROME_PROFILE_PATH = process.env.CHROME_PROFILE_PATH ||
    path.join(process.env.HOME || "/home/openclaw", "extensions/chrome-profile")

const ubolEnabled = fs.existsSync(UBOL_EXTENSION_PATH + "/manifest.json")

if (ubolEnabled) {
    console.log(`[uBOL] Extension found at: ${UBOL_EXTENSION_PATH}`)
} else {
    console.log(`[uBOL] Extension NOT found at: ${UBOL_EXTENSION_PATH} — ad blocking disabled`)
}

async function createBrowser() {
    try {
        if (global.finished == true) return

        global.browser = null

        const stealth = StealthPlugin()
        // puppeteer-real-browser already handles iframe.contentWindow and user-agent override
        // via rebrowser. Disabling those evasions avoids double-patching conflicts.
        stealth.enabledEvasions.delete("iframe.contentWindow")
        stealth.enabledEvasions.delete("user-agent-override")

        const extraArgs = []
        if (ubolEnabled) {
            // Extensions require persistent user-data-dir and non-headless mode
            fs.mkdirSync(CHROME_PROFILE_PATH, { recursive: true })
            extraArgs.push(
                `--load-extension=${UBOL_EXTENSION_PATH}`,
                `--user-data-dir=${CHROME_PROFILE_PATH}`,
                "--allow-extensions-in-incognito",
            )
        }

        const { browser } = await connect({
            headless: false,
            turnstile: true,
            connectOption: { defaultViewport: null },
            disableXvfb: false,
            plugins: [stealth],
            args: extraArgs,
        })

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
