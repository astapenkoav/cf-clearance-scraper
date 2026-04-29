#!/usr/bin/env node
/**
 * uBOL Healthcheck Script
 * Tests: service alive, extension loaded, ad blocking works
 */

const http = require('http')
const fs = require('fs')

// Fixed paths - always use openclaw home
const PROFILE_PATH = '/home/openclaw/extensions/chrome-profile'
const UBOL_PATH = '/home/openclaw/extensions/ubol'

function post(data) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data)
        const req = http.request({
            hostname: 'localhost', port: 3000,
            path: '/cf-clearance-scraper', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, res => {
            let d = ''; res.on('data', chunk => d += chunk)
            res.on('end', () => { try { resolve(JSON.parse(d)) } catch(e) { reject(e) } })
        })
        req.on('error', reject)
        req.setTimeout(60000, () => req.destroy(new Error('timeout')))
        req.write(body); req.end()
    })
}

async function main() {
    let passed = 0, failed = 0

    // 1. Service alive
    const alive = await new Promise(resolve => {
        http.get('http://localhost:3000/', res => resolve(res.statusCode === 404))
             .on('error', () => resolve(false))
    })
    console.log(`[1] Service alive: ${alive ? '✓' : '✗'}`)
    alive ? passed++ : failed++

    // 2. Extension file exists + profile dir exists
    const ubolExists = fs.existsSync(UBOL_PATH + '/manifest.json')
    const profileExists = fs.existsSync(PROFILE_PATH + '/Default')
    const extOk = ubolExists && profileExists
    console.log(`[2] Extension+profile: ${extOk ? '✓' : '✗'} (ubol=${ubolExists}, profile=${profileExists})`)
    extOk ? passed++ : failed++

    // 3. Page loads
    try {
        const r = await post({ url: 'https://example.com', mode: 'source', waitForMs: 3000 })
        const ok = r.code === 200 && (r.source || '').length > 100
        console.log(`[3] Page loads: ${ok ? '✓' : '✗'} (code=${r.code}, len=${(r.source||'').length})`)
        ok ? passed++ : failed++
    } catch(e) {
        console.log(`[3] Page loads: ✗ ${e.message}`)
        failed++
    }

    // 4. Ad blocking - check that ad SCRIPT REQUESTS are blocked
    // We fetch a page and count inline ad script tags that still render content
    // Key insight: uBOL blocks the HTTP REQUEST - the src= tag stays in HTML
    // but the script never loads. We verify by checking if ad JS variables appear.
    try {
        const r = await post({
            url: 'https://www.speedtest.net/',
            mode: 'source',
            waitForMs: 5000
        })
        const src = r.source || ''
        // These appear in rendered DOM only if ad scripts EXECUTED
        const executedMarkers = ['window.googletag', 'googletag.cmd', 'pbjs', '__adroll']
        // These are just URLs in HTML source (may appear even when blocked)
        const htmlOnlyMarkers = ['googlesyndication.com', 'doubleclick.net']
        
        const executed = executedMarkers.filter(m => src.includes(m))
        const htmlRefs = htmlOnlyMarkers.filter(m => src.includes(m))
        
        // Network blocking works if ad scripts didn't execute
        const networkOk = executed.length === 0
        console.log(`[4] Ad blocking (network): ${networkOk ? '✓' : '✗'}`)
        if (htmlRefs.length > 0) {
            console.log(`    Note: ${htmlRefs.join(', ')} appear in HTML src= (expected - DNR blocks the request, not the tag)`)
        }
        if (executed.length > 0) {
            console.log(`    Ad scripts executed: ${executed.join(', ')}`)
        }
        networkOk ? passed++ : failed++
    } catch(e) {
        console.log(`[4] Ad blocking: ✗ ${e.message}`)
        failed++
    }

    const allOk = failed === 0
    console.log(`\nOverall: ${allOk ? '✅ ALL PASS' : `⚠️  ${failed} FAILED / ${passed} PASSED`}`)
    process.exit(allOk ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
