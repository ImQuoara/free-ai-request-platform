import type { MetadataRoute } from 'next';

const blockedAiRobots = [
  'PerplexityBot',
  'Perplexity-User',
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'CCBot',
  'Bytespider',
  'Google-Extended',
  'Amazonbot',
  'meta-externalagent',
  'meta-externalfetcher',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      ...blockedAiRobots.map((userAgent) => ({ userAgent, disallow: '/' })),
    ],
  };
}
