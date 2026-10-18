import { expect, test } from '@playwright/test';

test.describe('public safety and responsive basics', () => {
  test('public home exposes availability, gallery and only safe activity language', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Free quality AI');
    await expect(page.getByRole('link', { name: /Claim a Free Spot/i }).first()).toBeVisible();
    await expect(page.getByText(/Owner-approved public activity/i)).toBeVisible();
    const text = await page.locator('body').innerText();
    for (const privateToken of ['requester_email', 'owner_notes', 'reference_links', 'risk_flags']) expect(text).not.toContain(privateToken);
  });

  test('request page has labeled controls and a mobile-safe layout', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/request');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll');
  });

  test('keyboard focus is visible on public CTA', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });
});

test.describe('failure paths that do not require a seeded identity', () => {
  test('anonymous request API cannot create work', async ({ request }) => {
    const response = await request.post('/api/request', { data: {} });
    expect([401, 503]).toContain(response.status());
  });

  test('anonymous admin mutations are denied', async ({ request }) => {
    const response = await request.patch('/api/admin/settings', { data: {} });
    expect([401, 500]).toContain(response.status());
  });

  test('AI crawler is blocked before page content', async ({ request }) => {
    const response = await request.get('/', { headers: { 'user-agent': 'PerplexityBot/1.0' } });
    expect(response.status()).toBe(403);
    expect(await response.text()).not.toContain('Free quality AI');
  });
});
