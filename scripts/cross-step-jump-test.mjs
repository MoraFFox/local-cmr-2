import { spawn } from 'child_process';
import { chromium } from '@playwright/test';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const screenshotDir = path.resolve(__dirname, '../test-results');

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

function getContentType(filePath) {
  if (filePath.endsWith('.js')) return 'application/javascript';
  if (filePath.endsWith('.css')) return 'text/css';
  if (filePath.endsWith('.html')) return 'text/html';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.woff')) return 'font/woff';
  if (filePath.endsWith('.woff2')) return 'font/woff2';
  if (filePath.endsWith('.webmanifest')) return 'application/manifest+json';
  return 'application/octet-stream';
}

function startServer(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      const relativePath = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '');
      const filePath = path.resolve(distDir, relativePath);
      // Prevent directory traversal
      if (!filePath.startsWith(distDir + path.sep) && filePath !== distDir) {
        res.writeHead(403); res.end(); return;
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          // SPA fallback
          fs.readFile(path.resolve(distDir, 'index.html'), (err2, data2) => {
            if (err2) { res.writeHead(404); res.end(); return; }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data2);
          });
          return;
        }
        res.writeHead(200, { 'Content-Type': getContentType(filePath) });
        res.end(data);
      });
    });
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  const port = 4173;
  const server = await startServer(port);
  console.log(`Server running on http://127.0.0.1:${port}`);

  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });

    await page.goto(`http://127.0.0.1:${port}/companies/new`);
    await page.evaluate(() => {
      localStorage.setItem('dev-bypass-auth', '1');
    });
    await page.reload({ waitUntil: 'networkidle' });

    // Wait for the wizard to render
    await page.waitForTimeout(3000);

    await page.screenshot({ path: path.resolve(screenshotDir, 'cross-step-wizard-step1.png') });
    console.log('Saved: cross-step-wizard-step1.png');

    // Try to reach the review step by clicking Next up to 5 times
    for (let i = 0; i < 5; i += 1) {
      try {
        // Click the Next button in the fixed footer (right-most button)
        const nextButton = await page.locator('footer button').last();
        const text = await nextButton.textContent().catch(() => '');
        console.log(`Step ${i + 1} next button text:`, text.trim());
        await nextButton.click();
        await page.waitForTimeout(1500);
      } catch (e) {
        console.log('Next click error:', e.message);
        break;
      }
    }

    await page.screenshot({ path: path.resolve(screenshotDir, 'cross-step-wizard-after-next.png') });
    console.log('Saved: cross-step-wizard-after-next.png');

    // Look for a missing field button in MissingFieldsPanel and click it
    const missingFieldButton = await page.locator('[role="alert"] button, [class*="Exclamation"] button').first();
    if (await missingFieldButton.isVisible().catch(() => false)) {
      await missingFieldButton.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.resolve(screenshotDir, 'cross-step-after-jump.png') });
      console.log('Saved: cross-step-after-jump.png');
    } else {
      console.log('No missing field button visible');
    }
  } catch (error) {
    console.error('Test error:', error);
    await page?.screenshot({ path: path.resolve(screenshotDir, 'cross-step-error.png') });
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
