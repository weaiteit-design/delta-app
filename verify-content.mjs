// Script to clear the cache and take screenshots of the refined UI content
import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        await page.setViewport({ width: 430, height: 932 }); // Mobile viewport

        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        console.log('Navigating to app to clear cache...');
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

        await page.evaluate(() => {
            localStorage.removeItem('delta_pipeline_updates');
            localStorage.removeItem('delta_news_cache');
            localStorage.removeItem('delta_classified_items');
            console.log('Cleared all caches for a fresh start.');
        });

        console.log('Reloading to fetch highly filtered, actionable content...');
        await page.reload({ waitUntil: 'networkidle0' });

        // Wait for pipeline to finish and Daily Hack + Trending to load
        await new Promise(r => setTimeout(r, 6000));
        await page.screenshot({ path: '/Users/HP/.gemini/antigravity/brain/8721611e-9692-455f-9d2e-695cfa7ce112/home_screen_highly_actionable.png' });
        console.log('Took Home Screen screenshot.');

        // Go to Updates tab
        await page.click('button:nth-of-type(3)'); // 3rd tab is Updates
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: '/Users/HP/.gemini/antigravity/brain/8721611e-9692-455f-9d2e-695cfa7ce112/updates_screen_highly_actionable.png' });
        console.log('Took Updates Screen screenshot.');

        await browser.close();
        console.log('Script done.');
    } catch (err) {
        console.error('Script error:', err);
    }
})();
