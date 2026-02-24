import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            ignoreHTTPSErrors: true
        });
        const page = await browser.newPage();

        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('BROWSER ERROR:', msg.text());
            }
        });
        page.on('pageerror', err => {
            console.error('PAGE ERROR:', err.toString());
        });

        console.log('Navigating http://localhost:5173...');
        await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

        console.log('Waiting 10s for pipeline...');
        await new Promise(r => setTimeout(r, 10000));

        await browser.close();
    } catch (e) {
        console.error('Script error', e);
    }
})();
