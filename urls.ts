const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function hasControlCharacters(value: string) {
  return CONTROL_CHARACTERS.test(value);
}

export function sanitizeReferenceUrl(input: string): string {
  const value = input.trim();
  if (!value || value.length > 2048 || hasControlCharacters(value)) {
    throw new Error('Invalid reference URL.');
  }

  const url = new URL(value);
  if (url.protocol !== 'https:') {
    throw new Error('Reference links must use HTTPS.');
  }
  if (url.username || url.password) {
    throw new Error('Reference links cannot contain credentials.');
  }

  return url.toString();
}

export function sanitizeReferrerHost(input: string | null | undefined): string | null {
  if (!input) return null;
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.hostname.toLowerCase().slice(0, 253);
  } catch {
    return null;
  }
}
