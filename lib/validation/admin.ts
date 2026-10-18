import { z } from 'zod';
import { REQUEST_STATUSES } from '@/lib/domain/requests';

const reopenTimestamp = z.union([
  z.literal(null),
  z.string().datetime({ offset: true }),
]);

export const adminSettingsPatchSchema = z.object({
  requestsOpen: z.boolean(),
  spotsAvailable: z.number().int().min(0).max(100_000),
  reopensAt: reopenTimestamp,
  cooldownMinutes: z.number().int().min(1).max(1440),
  perPersonDailyCap: z.union([z.literal(null), z.number().int().min(1).max(100)]),
  autoDecrementOnAccept: z.boolean(),
  publicActivityEnabled: z.boolean(),
}).strict();

export const adminStatusSchema = z.object({
  targetStatus: z.enum(REQUEST_STATUSES),
}).strict();

export const notificationPatchSchema = z.object({
  read: z.boolean(),
}).strict();

export const ownerNotesSchema = z.object({
  ownerNotes: z.string().trim().max(5000),
}).strict();

const deliveryLinkSchema = z.object({
  label: z.string().trim().min(1).max(120),
  url: z.string().trim().url().refine((value) => value.startsWith('https://'), 'Delivery links must use HTTPS.'),
}).strict();

export const adminRequestDetailsSchema = z.object({
  ownerNotes: z.string().trim().max(5000),
  deliveryLinks: z.array(deliveryLinkSchema).max(20),
}).strict();

const optionalHttpsUrl = z.union([
  z.literal(null),
  z.string().trim().url().refine((value) => value.startsWith('https://'), 'Public asset links must use HTTPS.'),
]);

export const publicationSchema = z.object({
  activityEnabled: z.boolean(),
  safeTitle: z.union([z.literal(null), z.string().trim().min(1).max(120)]),
  showcase: z.discriminatedUnion('published', [
    z.object({ published: z.literal(false) }).strict(),
    z.object({
      published: z.literal(true),
      title: z.string().trim().min(1).max(120),
      description: z.string().trim().max(320),
      mediaType: z.enum(['audio', 'video', 'image', 'website', 'other']),
      assetUrl: optionalHttpsUrl,
      pageUrl: optionalHttpsUrl,
    }).strict(),
  ]),
}).strict();
