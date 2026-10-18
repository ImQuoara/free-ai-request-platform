import { describe, expect, it } from 'vitest';
import { messageSubmissionSchema } from '@/lib/validation/message';
import { classifyMessageActor } from '@/app/api/messages/route';

const requester = { id: '11111111-1111-4111-8111-111111111111', email: 'person@example.com' };

describe('message authorization contract', () => {
  it('derives requester role from server identity instead of request body', () => {
    expect(classifyMessageActor(requester, 'owner@example.com')).toBe('requester');
  });

  it('derives owner role only from exact configured owner email', () => {
    expect(classifyMessageActor({ ...requester, email: 'OWNER@example.com' }, 'owner@example.com')).toBe('owner');
  });

  it('accepts only UUID request ids and bounded clean messages', () => {
    expect(messageSubmissionSchema.safeParse({ requestId: requester.id, message: 'A private project reply.' }).success).toBe(true);
    expect(messageSubmissionSchema.safeParse({ requestId: 'R123', message: 'A private project reply.' }).success).toBe(false);
    expect(messageSubmissionSchema.safeParse({ requestId: requester.id, message: '' }).success).toBe(false);
    expect(messageSubmissionSchema.safeParse({ requestId: requester.id, message: 'x'.repeat(4001) }).success).toBe(false);
    expect(messageSubmissionSchema.safeParse({ requestId: requester.id, message: 'bad\u0000message' }).success).toBe(false);
  });

  it('contains no client-selectable senderRole field', () => {
    const parsed = messageSubmissionSchema.safeParse({ requestId: requester.id, message: 'hello', senderRole: 'owner' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect('senderRole' in parsed.data).toBe(false);
  });
});
