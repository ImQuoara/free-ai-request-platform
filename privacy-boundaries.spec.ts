import { expect, test } from '@playwright/test';

test('anonymous portal access is redirected to the request verification flow', async ({ page }) => {
  await page.goto('/portal');
  await expect(page).toHaveURL(/\/request\?auth=required/);
});

test('public pages never expose private request fields', async ({ page }) => {
  await page.goto('/');
  const body = await page.locator('body').innerText();
  expect(body).not.toContain('requester_email');
  expect(body).not.toContain('owner_notes');
  expect(body).not.toContain('reference_links');
});

test('private surfaces are non-cacheable and non-indexable', async ({ request }) => {
  for (const path of ['/portal', '/admin']) {
    const response = await request.get(path, { maxRedirects: 0 });
    const cache = response.headers()['cache-control'] ?? '';
    expect(cache).toContain('no-store');
    expect(response.headers()['x-robots-tag'] ?? '').toContain('noindex');
  }
});

test('security headers are present on public responses', async ({ request }) => {
  const response = await request.get('/');
  const headers = response.headers();
  expect(headers['content-security-policy']).toBeTruthy();
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBeTruthy();
  expect(headers['permissions-policy']).toBeTruthy();
});
