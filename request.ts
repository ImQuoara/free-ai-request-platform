import { z } from 'zod';
import { hasControlCharacters, sanitizeReferenceUrl } from '@/lib/security/urls';

const cleanText = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine((value) => !hasControlCharacters(value), 'Control characters are not allowed.');

const referenceUrl = z
  .string()
  .trim()
  .max(2048)
  .transform((value, ctx) => {
    try {
      return sanitizeReferenceUrl(value);
    } catch (error) {
      ctx.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'Invalid reference URL.' });
      return z.NEVER;
    }
  });

export const requestSubmissionSchema = z.object({
  name: cleanText(1, 120),
  discord: z.union([cleanText(1, 120), z.literal('')]).optional().default(''),
  type: z.enum(['Song', 'Landing Page', 'Other']),
  description: cleanText(10, 5000),
  referenceLinks: z.array(referenceUrl).max(5).default([]),
  consents: z.object({
    review: z.literal(true),
    rights: z.literal(true),
    scope: z.literal(true),
    showcase: z.literal(true),
    credit: z.literal(true),
  }),
  turnstileToken: z.string().trim().min(1).max(2048),
  honeypot: z.string().max(200).optional().default(''),
  sessionId: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9_-]+$/),
  source: z
    .object({
      utmSource: z.string().trim().max(80).optional().default(''),
      utmCampaign: z.string().trim().max(120).optional().default(''),
      referrer: z.string().trim().max(2048).optional().default(''),
    })
    .optional()
    .default({ utmSource: '', utmCampaign: '', referrer: '' }),
});

export type RequestSubmissionInput = z.infer<typeof requestSubmissionSchema>;
