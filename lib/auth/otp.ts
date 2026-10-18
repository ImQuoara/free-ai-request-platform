export function buildPasswordlessOtpOptions(origin: string, captchaToken: string) {
  const token = captchaToken.trim();
  if (!token) throw new Error('Human verification required');

  const parsedOrigin = new URL(origin);
  if (!['http:', 'https:'].includes(parsedOrigin.protocol)) {
    throw new Error('Invalid site origin');
  }

  return {
    emailRedirectTo: `${parsedOrigin.origin}/auth/callback?next=/request`,
    shouldCreateUser: true,
    captchaToken: token,
  } as const;
}
