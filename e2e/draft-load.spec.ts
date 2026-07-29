import { test, expect } from '@playwright/test';

test.describe('Draft Loading Logic', () => {
  test('loading a draft does not delete other drafts', async ({ page }) => {
    // 1. Navigate to the app and login
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'تسجيل دخول الإدارة' })).toBeVisible();
    await page.locator('input[type="email"]').fill('amrayman559@gmail.com');
    await page.locator('input[type="password"]').fill('12345678');
    await page.locator('button[type="submit"]').click();

    // Wait for dashboard to load
    const addBtn = page.locator('[data-testid="add-company-button"]').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    
    // 2. We inject two mock drafts directly into localStorage to simulate existing drafts
    await page.evaluate(() => {
      const drafts = [
        { id: 'draft_1', timestamp: Date.now() - 5000, currentStep: 1, formData: { companyName: 'Company Alpha' } },
        { id: 'draft_2', timestamp: Date.now() - 10000, currentStep: 1, formData: { companyName: 'Company Beta' } }
      ];
      localStorage.setItem('cmr_drafts', JSON.stringify(drafts));
    });
    
    // Reload to pick up the drafts in state
    await page.reload();
    
    // Wait for the sidebar to render the drafts
    await expect(page.getByText('Company Alpha').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Company Beta').first()).toBeVisible();

    // 3. Click on the second draft (Company Beta) to trigger the load dialog
    await page.getByText('Company Beta').first().click();
    
    // Click the confirmation button inside the modal ("تحميل المسودة")
    await page.getByRole('button', { name: 'تحميل المسودة' }).click();
    
    // Wait a moment for the form to populate and any potential auto-save side effects to occur
    await page.waitForTimeout(2000);

    // 5. CRITICAL CHECK: Verify that BOTH drafts still exist in localStorage!
    const savedDrafts = await page.evaluate(() => JSON.parse(localStorage.getItem('cmr_drafts')));
    
    expect(savedDrafts).not.toBeNull();
    expect(savedDrafts.length).toBe(2);
    
    const draftNames = savedDrafts.map(d => d.formData.companyName);
    expect(draftNames).toContain('Company Alpha');
    expect(draftNames).toContain('Company Beta');
  });
});
