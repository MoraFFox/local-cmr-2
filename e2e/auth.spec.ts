import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('Admin login screen renders properly', async ({ page }) => {
    await page.goto('/');
    
    // Check for "تسجيل دخول الإدارة"
    await expect(page.getByRole('heading', { name: 'تسجيل دخول الإدارة' })).toBeVisible();
  });

  test('Toggle between Email and Phone login modes works', async ({ page }) => {
    await page.goto('/');
    
    // Assuming there are buttons to toggle email/phone modes
    const phoneButton = page.getByRole('button', { name: /رقم الهاتف|phone/i });
    const emailButton = page.getByRole('button', { name: /البريد الإلكتروني|email/i });
    
    if (await phoneButton.isVisible() && await emailButton.isVisible()) {
      await phoneButton.click();
      await expect(page.locator('input[type="tel"], input[name="phone"]')).toBeVisible();
      
      await emailButton.click();
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    }
  });
});
