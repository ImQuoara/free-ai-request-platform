import { expect, test } from '@playwright/test';

test('request page makes verified email access explicit before submission', async ({ page }) => {
  await page.goto('/request');
  await expect(page.getByRole('heading', { name: /verify your email/i })).toBeVisible();
  await expect(page.getByLabel(/email address/i)).toBeVisible();
  await expect(page.getByText(/submission does not guarantee acceptance/i)).toBeVisible();
});

test('public home shows owner-controlled availability and claim CTA', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/spots|requests closed/i).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /claim a free spot/i }).first()).toHaveAttribute('href', '/request');
});
