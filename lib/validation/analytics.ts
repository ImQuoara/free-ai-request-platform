import { z } from 'zod';
import { safeAnalyticsPath } from '@/lib/domain/analytics';

export const analyticsVisitSchema = z.object({
  eventName: z.enum(['page_view', 'work_view']),
  path: z.string().min(1).max(300).refine(safeAnalyticsPath, 'Only public analytics paths are allowed.'),
  source: z.string().trim().max(80).optional().default(''),
  campaign: z.string().trim().max(120).optional().default(''),
  referrer: z.string().trim().max(2048).optional().default(''),
  sessionId: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9_-]+$/),
}).strict();
