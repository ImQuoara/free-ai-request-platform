import { z } from 'zod';
import { hasControlCharacters } from '@/lib/security/urls';

export const messageSubmissionSchema = z.object({
  requestId: z.string().uuid(),
  message: z
    .string()
    .trim()
    .min(1)
    .max(4000)
    .refine((value) => !hasControlCharacters(value), 'Control characters are not allowed.'),
});

export type MessageSubmissionInput = z.infer<typeof messageSubmissionSchema>;
