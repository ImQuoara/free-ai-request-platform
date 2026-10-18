type EdgeContext = { next(): Promise<Response> };

export default async function requestRateLimit(_request: Request, context: EdgeContext) {
  return context.next();
}

export const config = {
  path: '/api/request',
  method: 'POST',
  rateLimit: {
    windowLimit: 6,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};
