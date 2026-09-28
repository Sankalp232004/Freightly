import { test, expect } from '@playwright/test';

test.describe('Freightly Main Consignment Flow (Pune → Ahmedabad 5,000 kg)', () => {
  test('user enters shipment details and immediately receives ranked multi-modal comparison ledger', async ({ page }) => {
    // 1. Open the application home
    await page.goto('/');

    // 2. Check title and masthead
    await expect(page).toHaveTitle(/Freightly/i);
    await expect(page.getByRole('heading', { name: /Consignment Details/i })).toBeVisible();

    // 3. Fill in Origin: Pune
    const originInput = page.getByLabel(/Origin \(Pickup City \/ Hub\)/i);
    await originInput.fill('Pune');

    // Autocomplete dropdown may appear; wait briefly or select
    const puneOption = page.locator('li[role="option"]', { hasText: 'Pune' });
    if (await puneOption.count() > 0) {
      await puneOption.first().click();
    }

    // 4. Fill in Destination: Ahmedabad
    const destInput = page.getByLabel(/Destination \(Delivery City \/ Hub\)/i);
    await destInput.fill('Ahmedabad');

    const ahmedabadOption = page.locator('li[role="option"]', { hasText: 'Ahmedabad' });
    if (await ahmedabadOption.count() > 0) {
      await ahmedabadOption.first().click();
    }

    // 5. Fill Gross Weight: 5,000 kg
    const weightInput = page.getByLabel(/Gross Weight \(kg\)/i);
    await weightInput.fill('5000');

    // 6. Ensure GST is checked
    const gstCheckbox = page.getByLabel(/GST Registered Shipper/i);
    if (!(await gstCheckbox.isChecked())) {
      await gstCheckbox.check();
    }

    // 7. Click Compare Rates
    const compareBtn = page.getByRole('button', { name: /Compare Rates/i });
    await compareBtn.click();

    // 8. Assert Ranked Results Appearance
    // Headline showing route
    await expect(page.getByRole('heading', { name: /Pune → Ahmedabad/i })).toBeVisible({ timeout: 15000 });

    // Distance and weight info
    await expect(page.getByText(/5,000 kg/i).first()).toBeVisible();
    await expect(page.getByText(/km/i).first()).toBeVisible();

    // Check for "Lowest Cost" stamp badge
    await expect(page.locator('.stamp-badge').first()).toBeVisible();

    // Check that multiple options are ranked
    await expect(page.getByRole('heading', { name: /Road/i }).first()).toBeVisible();

    // Expand the ledger breakdown on the first card
    const viewLedgerBtn = page.getByRole('button', { name: /View Ledger Breakdown/i }).first();
    await viewLedgerBtn.click();

    // Assert printed ledger with dotted leaders and double rule
    await expect(page.getByText(/Line Item Description/i).first()).toBeVisible();
    await expect(page.getByText(/Total Estimated Cost/i).first()).toBeVisible();
    await expect(page.locator('.ledger-total-rule').first()).toBeVisible();

    // Check that URL updated with comparison ID
    await expect(page).toHaveURL(/\/compare\/[0-9a-f-]+/);
  });
});
