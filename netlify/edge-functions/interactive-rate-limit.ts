type EdgeContext = { next(): Promise<Response> };

export default async function interactiveRateLimit(_request: Request, context: EdgeContext) {
  return context.next();
}

export const config = {
  path: ['/api/messages', '/api/analytics/visit'],
  method: 'POST',
  rateLimit: {
    windowLimit: 60,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};
