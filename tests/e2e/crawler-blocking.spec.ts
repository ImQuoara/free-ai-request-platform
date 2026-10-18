import { expect, test } from '@playwright/test';

test('ordinary browser is not denied by crawler protection', async ({ request }) => {
  const response = await request.get('/', { headers: { 'user-agent': 'Mozilla/5.0 Chrome/156.0 Safari/537.36' } });
  expect(response.status()).toBe(200);
});

test('Perplexity crawler identities are denied at the edge', async ({ request }) => {
  for (const userAgent of ['PerplexityBot/1.0', 'Perplexity-User/1.0']) {
    const response = await request.get('/', { headers: { 'user-agent': userAgent } });
    expect(response.status()).toBe(403);
  }
});
