/**
 * Temporary bilingual UI verification script, pass 2.
 * Captures per-page: first h1, main-content text, screenshots, and whether the
 * expected page-specific label is present - in Arabic and English modes.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:3000';
const SHOT_DIR = '.planning/tmp/shots';
fs.mkdirSync(SHOT_DIR, { recursive: true });

const results = { pages: {}, consoleErrors: [] };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on('console', (msg) => {
  if (msg.type() === 'error') results.consoleErrors.push(`[console] ${msg.text()}`);
});
page.on('pageerror', (err) => results.consoleErrors.push(`[pageerror] ${err.message}`));
page.on('requestfailed', (req) => {
  const u = req.url();
  if (!u.includes('favicon') && !u.includes('/@vite/') && !u.includes('HMR')) {
    results.consoleErrors.push(`[requestfailed] ${req.method()} ${u} (${req.failure()?.errorText ?? 'unknown'})`);
  }
});

await page.addInitScript(() => {
  localStorage.setItem('dev-bypass-auth', '1');
});
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(2000);

async function clickNav(name) {
  try {
    await page.getByRole('button', { name, exact: true }).first().click({ timeout: 5000 });
    return true;
  } catch {
    try {
      await page.locator(`text=${name}`).first().click({ timeout: 5000 });
      return true;
    } catch {
      results.consoleErrors.push(`[nav] could not click "${name}"`);
      return false;
    }
  }
}

async function checkPage(lang, key, navLabel, expectedLabels) {
  await clickNav(navLabel);
  await page.waitForTimeout(1200);
  const html = page.locator('html');
  const h1s = (await page.locator('h1').allInnerTexts().catch(() => []))
    .map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const h2s = (await page.locator('h2').allInnerTexts().catch(() => []))
    .map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 6);
  const main = page.locator('main, [role="main"]').first();
  let mainText = '';
  if (await main.count()) {
    mainText = (await main.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  }
  const bodyText = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  const found = Object.fromEntries(expectedLabels.map((l) => [l, bodyText.includes(l)]));
  await page.screenshot({ path: `${SHOT_DIR}/${lang}-${key}.png` });
  results.pages[`${lang}.${key}`] = {
    lang: (await html.getAttribute('lang')) ?? '',
    dir: (await html.getAttribute('dir')) ?? '',
    h1: h1s,
    h2: h2s,
    mainText: mainText.slice(0, 500),
    expectedLabelsFound: found,
    undefinedCount: (bodyText.match(/undefined/gi) || []).length,
  };
}

// Arabic mode (default)
await checkPage('ar', 'history', 'السجل', ['سجل الإرسالات', 'طباعة', 'فلاتر']);
await checkPage('ar', 'baristas', 'أداء الباريستا', ['أداء الباريستا']);
await checkPage('ar', 'settings', 'الإعدادات', ['الإعدادات']);

// Switch to English
try {
  await page.getByRole('button', { name: 'التبديل إلى الإنجليزية', exact: true }).click({ timeout: 5000 });
} catch {
  await page.locator('text=التبديل إلى الإنجليزية').first().click({ timeout: 5000 });
}
await page.waitForTimeout(1500);

await checkPage('en', 'history', 'History', ['Submissions Log', 'No records yet']);
await checkPage('en', 'baristas', 'Barista Performance', ['Barista Performance', 'No baristas']);
await checkPage('en', 'settings', 'Settings', ['Machine Management', 'Custom Catalog', 'Word Export Template']);

await browser.close();
console.log('RESULT_JSON:');
console.log(JSON.stringify(results, null, 2));
