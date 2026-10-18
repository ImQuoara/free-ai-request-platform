import { describe, expect, it } from 'vitest';
import { safeAuthNextPath } from '@/lib/security/redirects';

describe('safeAuthNextPath', () => {
  it('allows only intended internal auth destinations', () => {
    expect(safeAuthNextPath('/request')).toBe('/request');
    expect(safeAuthNextPath('/portal/11111111-1111-4111-8111-111111111111?from=email')).toBe('/portal/11111111-1111-4111-8111-111111111111?from=email');
    expect(safeAuthNextPath('/admin/settings')).toBe('/admin/settings');
  });

  it('rejects external, protocol-relative, backslash, encoded-backslash and unrelated paths', () => {
    for (const value of [
      'https://evil.example/',
      '//evil.example/',
      '/\\evil.example/',
      '/%5cevil.example/',
      '/api/admin/settings',
      '/somewhere-else',
    ]) {
      expect(safeAuthNextPath(value)).toBe('/portal');
    }
  });

  it('uses the private portal as the safe default', () => {
    expect(safeAuthNextPath(null)).toBe('/portal');
    expect(safeAuthNextPath('')).toBe('/portal');
  });
});
