export const REQUEST_TURNSTILE_ACTION = 'request-submit';
export const AUTH_TURNSTILE_ACTION = 'auth-email';

export type TurnstileRenderOptions = {
  sitekey: string;
  theme?: 'light' | 'dark' | 'auto';
  action?: string;
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'timeout-callback'?: () => void;
  'error-callback'?: (code?: string) => boolean | void;
};

export type TurnstileBrowserApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string | undefined;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};
