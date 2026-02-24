import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        await page.setViewport({ width: 430, height: 932 });

        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

        console.log('Navigating to http://localhost:5173...');
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

        console.log('Waiting 3 seconds for pipeline to finish...');
        await new Promise(r => setTimeout(r, 3000));

        // Check local storage state
        const storageState = await page.evaluate(() => {
            return {
                updatesLength: JSON.parse(localStorage.getItem('delta_pipeline_updates') || '[]').length,
                classifiedLength: Object.keys(JSON.parse(localStorage.getItem('delta_classified_items') || '{}')).length,
                stats: localStorage.getItem('delta_pipeline_stats')
            };
        });
        console.log('Local Storage State:', storageState);

        // Look at the DOM
        const bodyHTML = await page.evaluate(() => document.body.innerText.substring(0, 2000));
        console.log('DOM Text Preview:', bodyHTML.replace(/\n/g, ' '));

        console.log('Clicking Updates tab...');
        await page.click('button:nth-of-type(3)');
        await new Promise(r => setTimeout(r, 2000));

        const updatesHTML = await page.evaluate(() => document.body.innerText.substring(0, 2000));
        console.log('Updates Tab Text:', updatesHTML.replace(/\n/g, ' '));

        await browser.close();
    } catch (err) {
        console.error('Puppeteer Error:', err);
    }
})();
