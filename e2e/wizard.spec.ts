import { test, expect } from '@playwright/test';

test.describe('Form Wizard Critical Path', () => {
  // Use a longer timeout for E2E tests that involve real network/db calls
  test.setTimeout(30000);

  test('can login and view the dashboard', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the login form to be visible
    await expect(page.getByRole('heading', { name: 'تسجيل دخول الإدارة' })).toBeVisible();

    // Fill in credentials
    await page.locator('input[type="email"]').fill('amrayman559@gmail.com');
    await page.locator('input[type="password"]').fill('12345678');
    
    // Click submit
    await page.locator('button[type="submit"]').click();

    // Wait for dashboard to load (should see the sidebar or add company button)
    // The sidebar has a button "إضافة شركة جديدة"
    const addCompanyBtn = page.locator('button[title="إضافة شركة جديدة"]').first();
    await expect(addCompanyBtn).toBeVisible({ timeout: 10000 });
  });
});
