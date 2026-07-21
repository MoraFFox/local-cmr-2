import { test, expect } from '@playwright/test';

test.describe('Draft Logic', () => {
  test('Creating a new draft does not overwrite previous drafts', async ({ page }) => {
    await page.goto('/');
    
    // Login
    await expect(page.getByRole('heading', { name: 'تسجيل دخول الإدارة' })).toBeVisible();
    await page.locator('input[type="email"]').fill('amrayman559@gmail.com');
    await page.locator('input[type="password"]').fill('12345678');
    await page.locator('button[type="submit"]').click();

    // Wait for dashboard to load
    const addBtn = page.locator('button[title="إضافة شركة جديدة"]').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    
    // Navigate to form
    await addBtn.click();
    
    // Fill first draft
    await page.locator('input[name="companyName"]').fill('Company A');
    await page.waitForTimeout(1500); // Wait for auto-save

    // Click "Add New"
    await addBtn.click();
    
    // Confirm starting a new form
    await page.getByRole('button', { name: 'نعم، ابدأ' }).click();
    
    // Form should be empty
    await expect(page.locator('input[name="companyName"]')).toHaveValue('');

    // Fill second draft
    await page.locator('input[name="companyName"]').fill('Company B');
    await page.waitForTimeout(1500); // Wait for auto-save

    // Check drafts list
    const drafts = await page.evaluate(() => JSON.parse(localStorage.getItem('cmr_drafts')));
    expect(drafts.length).toBe(2);
    expect(drafts[0].formData.companyName).toBe('Company B');
    expect(drafts[1].formData.companyName).toBe('Company A');
  });
});
