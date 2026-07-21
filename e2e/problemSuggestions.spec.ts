import { test, expect, Page } from '@playwright/test';

const login = async (page: Page) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'تسجيل دخول الإدارة' })).toBeVisible();
  await page.locator('input[type="email"]').fill('amrayman559@gmail.com');
  await page.locator('input[type="password"]').fill('12345678');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('[data-testid="add-company-button"]').first()).toBeVisible({ timeout: 10000 });
};

/** Programmatically click an input by id, bypassing fixed overlays. */
const checkById = async (page: Page, id: string) => {
  await page.locator(`#${id}`).evaluate((el: HTMLInputElement) => el.click());
};

/** Programmatically click a CheckboxGroup option by its data-value, bypassing
 * fixed overlays that intercept pointer events. */
const checkByValue = async (page: Page, value: string) => {
  await page.evaluate((v) => {
    const inputs = Array.from(document.querySelectorAll('input[type="checkbox"][data-value]'));
    const input = inputs.find((el) => el.getAttribute('data-value') === v) as HTMLInputElement | undefined;
    if (!input) throw new Error(`Checkbox input not found for value: ${v}`);
    input.click();
  }, value);
};

test.describe('Maintenance Editor: Problem → Suggestion Mapping', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);

    // Open the first company's maintenance page via the desktop ⋮ menu.
    const firstCard = page.locator('[data-testid^="company-card-"]').first();
    await expect(firstCard).toBeVisible();
    await firstCard.locator('button[aria-label="المزيد من الإجراءات"]').click();
    await page.getByRole('button', { name: 'تعديل الصيانة' }).click();

    // Select the Main Office branch and add a new record.
    await expect(page.getByRole('heading', { name: 'Select a Branch' })).toBeVisible();
    await page.locator('button').filter({ hasText: 'Main Office' }).click();
    await page.locator('button').filter({ hasText: 'Add Record' }).click();

    // New records default to hadProblem=true, so the problems section is
    // already expanded and the problem checkbox is already checked.
  });

  test('low temperature problem suggests heater replacement', async ({ page }) => {
    // Select the predefined low-temperature problem and wait for suggestions.
    await checkByValue(page, 'درجة حرارة الماكينة منخفضة');

    // Open the services section and verify the suggestion.
    await page.locator('[data-testid="section-services"]').click({ force: true });
    const suggestedServices = page.locator('[data-testid="suggested-services"]');
    await expect(suggestedServices).toBeVisible();
    await expect(suggestedServices.getByText('تغيير heater')).toBeVisible();

    // Open the parts section and verify the heater part is suggested.
    await page.locator('[data-testid="section-parts"]').click({ force: true });
    await checkById(page, 'partsWereReplaced');
    const suggestedParts = page.locator('[data-testid="suggested-parts"]');
    await expect(suggestedParts).toBeVisible();
    await expect(suggestedParts.getByText('هيتر')).toBeVisible();
  });

  test('high temperature problem does not suggest heater replacement', async ({ page }) => {
    // Select the predefined high-temperature problem and wait for suggestions.
    await checkByValue(page, 'درجة حرارة الماكينة مرتفعة');

    // Open the services section and verify only tuning is suggested.
    await page.locator('[data-testid="section-services"]').click({ force: true });
    const suggestedServices = page.locator('[data-testid="suggested-services"]');
    await expect(suggestedServices).toBeVisible();
    await expect(suggestedServices.getByText('ضبط الحراره')).toBeVisible();
    await expect(suggestedServices.getByText('تغيير heater')).toBeHidden();
  });

  test('water leak problem suggests gasket and pump services', async ({ page }) => {
    // Select the predefined water leak problem and wait for suggestions.
    await checkByValue(page, 'تسريب مياة');

    // Open the services section and verify the suggestions.
    await page.locator('[data-testid="section-services"]').click({ force: true });
    const suggestedServices = page.locator('[data-testid="suggested-services"]');
    await expect(suggestedServices).toBeVisible();
    await expect(suggestedServices.getByText('تغيير جوانات')).toBeVisible();
    await expect(suggestedServices.getByText('تغيير طرمبة')).toBeVisible();
  });
});
