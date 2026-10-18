import { expect, test } from '@playwright/test';

test('anonymous users cannot open owner dashboard', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/request\?auth=required/);
});

test('admin route is never indexed', async ({ request }) => {
  const response = await request.get('/admin');
  expect(response.headers()['x-robots-tag']).toContain('noindex');
});
