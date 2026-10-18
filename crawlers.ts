const BLOCKED_AI_USER_AGENT_TOKENS = [
  'perplexitybot',
  'perplexity-user',
  'gptbot',
  'chatgpt-user',
  'oai-searchbot',
  'claudebot',
  'claude-web',
  'anthropic-ai',
  'bytespider',
  'ccbot',
  'cohere-ai',
  'amazonbot',
  'meta-externalagent',
  'meta-externalfetcher',
  'diffbot',
  'omgili',
  'omgilibot',
] as const;

export function isBlockedAiCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const normalized = userAgent.toLowerCase();
  return BLOCKED_AI_USER_AGENT_TOKENS.some((token) => normalized.includes(token));
}

export const blockedAiCrawlerTokens = [...BLOCKED_AI_USER_AGENT_TOKENS];
