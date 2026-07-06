import { test, expect } from '@playwright/test';

test.describe('Routing', () => {
  test('App redirects unauthenticated users to login screen', async ({ page }) => {
    // Attempt to access a protected route
    await page.goto('/dashboard');
    
    // Verify that the login screen is rendered (auth gateway works)
    await expect(page.getByRole('heading', { name: 'تسجيل دخول الإدارة' })).toBeVisible();
  });
});
