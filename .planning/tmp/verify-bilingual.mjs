/**
 * Temporary bilingual UI verification script (not part of the test suite).
 * Drives the dev server at localhost:3000 and verifies Arabic + English
 * rendering of the History, Baristas, and Settings pages, collecting console
 * errors and layout hints along the way.
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const results = {
  arabic: { sidebarButtons: [], pages: {} },
  english: { sidebarButtons: [], pages: {} },
  consoleErrors: [],
  htmlLangDir: { arabic: {}, english: {} },
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on('console', (msg) => {
  if (msg.type() === 'error') {
    results.consoleErrors.push(`[console] ${msg.text()}`);
  }
});
page.on('pageerror', (err) => {
  results.consoleErrors.push(`[pageerror] ${err.message}`);
});
page.on('requestfailed', (req) => {
  const u = req.url();
  if (!u.includes('favicon') && !u.includes('/@vite/') && !u.includes('vite') && !u.includes('HMR')) {
    results.consoleErrors.push(`[requestfailed] ${req.method()} ${u} (${req.failure()?.errorText ?? 'unknown'})`);
  }
});

async function snapshot() {
  const html = page.locator('html');
  return {
    lang: (await html.getAttribute('lang')) ?? '',
    dir: (await html.getAttribute('dir')) ?? '',
  };
}

async function clickNav(name) {
  const byRole = page.getByRole('button', { name, exact: true }).first();
  try {
    await byRole.click({ timeout: 5000 });
    return true;
  } catch {
    try {
      await page.locator(`text=${name}`).first().click({ timeout: 5000 });
      return true;
    } catch {
      results.consoleErrors.push(`[nav] could not click nav item "${name}"`);
      return false;
    }
  }
}

async function checkPage(pageName) {
  const info = await snapshot();
  const headings = (await page.locator('h1, h2, h3').allInnerTexts().catch(() => []))
    .map((h) => h.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const bodyText = (await page.locator('body').innerText().catch(() => ''))
    .replace(/\s+/g, ' ')
    .trim();
  const undefinedCount = (bodyText.match(/undefined/gi) || []).length;
  return {
    headings,
    bodySample: bodyText.slice(0, 600),
    undefinedCount,
    ...info,
  };
}

// Bypass admin auth before the app boots.
await page.addInitScript(() => {
  localStorage.setItem('dev-bypass-auth', '1');
});
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(2000);

const arabicSidebar = (await page.getByRole('button').allInnerTexts().catch(() => []))
  .map((t) => t.replace(/\s+/g, ' ').trim())
  .filter(Boolean);
results.arabic.sidebarButtons = arabicSidebar.slice(0, 20);

// --- Arabic mode ---
results.arabic.htmlLangDir = await snapshot();

const arabicNav = [
  ['history', 'السجل'],
  ['baristas', 'أداء الباريستا'],
  ['settings', 'الإعدادات'],
];
for (const [key, label] of arabicNav) {
  await clickNav(label);
  results.arabic.pages[key] = await checkPage(label);
}

// --- Switch to English ---
try {
  await page.getByRole('button', { name: 'التبديل إلى الإنجليزية', exact: true }).click({ timeout: 5000 });
} catch {
  try {
    await page.locator('text=التبديل إلى الإنجليزية').first().click({ timeout: 5000 });
  } catch {
    results.consoleErrors.push('[toggle] could not find the language toggle button');
  }
}
await page.waitForTimeout(1500);

const englishSidebar = (await page.getByRole('button').allInnerTexts().catch(() => []))
  .map((t) => t.replace(/\s+/g, ' ').trim())
  .filter(Boolean);
results.english.sidebarButtons = englishSidebar.slice(0, 20);

// --- English mode ---
results.english.htmlLangDir = await snapshot();

const englishNav = [
  ['history', 'History'],
  ['baristas', 'Barista Performance'],
  ['settings', 'Settings'],
];
for (const [key, label] of englishNav) {
  await clickNav(label);
  results.english.pages[key] = await checkPage(label);
}

await browser.close();

console.log('RESULT_JSON:');
console.log(JSON.stringify(results, null, 2));
