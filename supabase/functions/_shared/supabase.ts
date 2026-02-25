// Shared Supabase client factory for Edge Functions
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Service-role client (admin access, bypasses RLS)
export function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

// User-scoped client (respects RLS, uses the user's JWT)
export function getUserClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get('Authorization') ?? '';
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
}

// Extract user ID from JWT (requires auth header)
export async function getAuthUserId(req: Request): Promise<string | null> {
  const client = getUserClient(req);
  const { data: { user } } = await client.auth.getUser();
  return user?.id ?? null;
}
