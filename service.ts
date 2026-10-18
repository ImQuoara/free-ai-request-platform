import 'server-only';

import { createClient } from '@supabase/supabase-js';

let serviceClient: ReturnType<typeof createClient> | undefined;

export function createServiceSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error('Missing server-only Supabase environment configuration.');
  }

  serviceClient ??= createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return serviceClient;
}
