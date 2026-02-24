// Script to clear the old cache so that the new filter runs instantly
import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();

        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        console.log('Navigating to app to clear cache...');
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

        await page.evaluate(() => {
            localStorage.removeItem('delta_pipeline_updates');
            localStorage.removeItem('delta_news_cache');
            localStorage.removeItem('delta_classified_items');
            console.log('Cleared all pipeline and classified caches.');
        });

        console.log('Reloading page to trigger fresh pipeline fetch...');
        await page.reload({ waitUntil: 'networkidle0' });

        await new Promise(r => setTimeout(r, 4000));

        await browser.close();
        console.log('Script done.');
    } catch (err) {
        console.error('Script error:', err);
    }
})();
