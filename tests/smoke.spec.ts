import { test, expect } from '@playwright/test';

test.describe('Midoes CRM Smoke Tests', () => {
  test('should load the index route correctly', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173/');
    
    // Test the RTL configuration
    const htmlDir = await page.locator('html').getAttribute('dir');
    expect(htmlDir).toBe('rtl');
    
    // Check branded document title
    await expect(page).toHaveTitle('ميدوز — نظام إدارة الصيانة');
  });

  test('should load the technician login path', async ({ page }) => {
    await page.goto('http://127.0.0.1:4173/technician');
    
    // Ensure the technician login portal loads
    const loginHeader = page.locator('h1').first();
    await expect(loginHeader).toBeVisible();
    
    // A specific Arabic string we expect on the portal
    await expect(page.getByText('تسجيل الدخول', { exact: false }).first()).toBeVisible();
  });
});
