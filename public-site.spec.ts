import { expect, test } from '@playwright/test';

test('anonymous home page exposes the public offer without private/admin navigation', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole('heading', { name: /free quality ai songs, landing pages & assets/i }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /admin/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /private portal/i })).toHaveCount(0);
});
