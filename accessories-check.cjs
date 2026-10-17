const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const results = [];
  for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => message.type() === 'error' && errors.push(message.text()));
    page.on('requestfailed', request => errors.push(`${request.failure()?.errorText}: ${request.url()}`));
    await page.goto('file:///D:/store-websit/Store-Ecommerce/accessories.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.screenshot({ path: `accessories-${viewport.name}.png`, fullPage: true });
    const cards = page.locator('[data-product-id]');
    const initial = await cards.count();
    if (viewport.name === 'desktop') {
      const sony = page.locator('main aside label').filter({ hasText: 'Sony' }).first().locator('input');
      await sony.check();
      const visibleAfterBrand = await cards.evaluateAll(items => items.filter(item => !item.hidden).length);
      await page.locator('#sort-select').selectOption({ label: 'Price: Low to High' });
      await page.getByRole('button', { name: /Add to Cart/ }).first().click();
      const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('almumez-cart')));
      await cards.first().getByTitle('Add to Wishlist').click();
      const wishlist = await page.evaluate(() => JSON.parse(localStorage.getItem('almumez-wishlist')));
      results.push({ viewport: viewport.name, initial, visibleAfterBrand, cart, wishlist, errors, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
      await page.getByRole('button', { name: /Reset All/ }).click();
      await cards.first().locator('h3').click();
      await page.waitForURL(/product\.html\?id=/);
      results.push({ detailId: await page.locator('body').getAttribute('data-product-id'), detailTitle: await page.locator('main h1').textContent() });
    } else {
      results.push({ viewport: viewport.name, initial, errors, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
    }
    await page.close();
  }
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
