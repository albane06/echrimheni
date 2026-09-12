import { createClient } from '@supabase/supabase-js';

export function getSupabaseClient(supabaseUrl?: string, supabaseKey?: string) {
  const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const key = supabaseKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key';

  return createClient(url, key);
}

export function getSupabaseAdminClient(supabaseUrl?: string, serviceRoleKey?: string) {
  const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const key = serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-role-key';

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
