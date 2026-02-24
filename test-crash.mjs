import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();

        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
        page.on('requestfailed', request => console.error('REQUEST FAILED:', request.url(), request.failure()?.errorText));

        console.log('Navigating to http://localhost:5173 ...');
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 10000 });

        console.log('Waiting for potential crashes...');
        await new Promise(r => setTimeout(r, 3000));

        await browser.close();
        console.log('Done.');
    } catch (err) {
        console.error('Script error:', err);
    }
})();
