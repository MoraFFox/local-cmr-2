import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.addInitScript(() => localStorage.setItem('dev-bypass-auth', '1'));
await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(1500);

// Go to Baristas and open the debug panel
await page.getByRole('button', { name: 'أداء الباريستا', exact: true }).click();
await page.waitForTimeout(800);
await page.getByTitle('تبديل وضع التصحيح').click();
await page.waitForTimeout(500);

const debugHead = await page.locator('h3').filter({ hasText: 'تصحيح' }).first().innerText().catch(() => '');
const headers = await page.locator('table th').allInnerTexts();
const bodyHasYes = await page.locator('body').innerText().then((t) => t.includes('نعم') || t.includes('لا'));

console.log('DEBUG_PANEL_ARABIC:', JSON.stringify({
  debugHeading: debugHead,
  tableHeaders: headers,
  yesNoLocalized: bodyHasYes,
  consoleErrors: errors,
}, null, 2));
await browser.close();
