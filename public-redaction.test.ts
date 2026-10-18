import { describe, expect, it } from 'vitest';
import { toPublicActivity } from '@/lib/domain/public-projection';

const privateRequest = {
  id: '11111111-1111-4111-8111-111111111111',
  public_id: 'RABCDEF12',
  requester_id: '22222222-2222-4222-8222-222222222222',
  requester_email: 'secret@example.com',
  name: 'Private Name',
  discord: 'private_handle',
  request_type: 'Song',
  description: 'PRIVATE PROMPT WORDS',
  reference_links: ['https://private.example/ref'],
  owner_notes: 'OWNER SECRET NOTE',
  risk_flags: ['MULTI_ACCOUNT_NETWORK'],
  status: 'NEW',
  created_at: '2026-10-17T12:00:00.000Z',
  privateMessage: 'MESSAGE SECRET',
};

describe('public activity projection', () => {
  it('serializes only the approved safe activity fields', () => {
    const output = toPublicActivity(privateRequest, 'Anonymous song request');
    expect(Object.keys(output).sort()).toEqual(['created_date', 'public_id', 'public_status', 'request_type', 'safe_title']);
    expect(output).toEqual({
      public_id: 'RABCDEF12',
      request_type: 'Song',
      public_status: 'NEW',
      created_date: '2026-10-17',
      safe_title: 'Anonymous song request',
    });
  });

  it('cannot leak private keys or private values when serialized', () => {
    const serialized = JSON.stringify(toPublicActivity(privateRequest, null));
    for (const forbidden of [
      'secret@example.com', 'Private Name', 'private_handle', 'PRIVATE PROMPT WORDS',
      'private.example', 'OWNER SECRET NOTE', 'MULTI_ACCOUNT_NETWORK',
      '11111111-1111-4111-8111-111111111111', 'MESSAGE SECRET',
      'requester_email', 'requester_id', 'description', 'reference_links', 'owner_notes', 'risk_flags',
    ]) expect(serialized).not.toContain(forbidden);
  });
});
