import { isBlockedAiCrawler } from '../../lib/security/crawlers.ts';

type EdgeContext = {
  next(): Promise<Response>;
};

export default async function aiCrawlerBlock(request: Request, context: EdgeContext) {
  if (isBlockedAiCrawler(request.headers.get('user-agent'))) {
    return new Response('Automated AI crawling is not permitted.', {
      status: 403,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
        'x-robots-tag': 'noindex, nofollow, noarchive',
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'referrer-policy': 'no-referrer',
      },
    });
  }

  return context.next();
}

export const config = { path: '/*' };
