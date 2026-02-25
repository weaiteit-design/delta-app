// ============================================================
// Delta AI — Reviews API Edge Function
// GET  /reviews-api/:slug  → list reviews for a tool
// POST /reviews-api/:slug  → submit a review (auth required, +30 XP)
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getServiceClient, getAuthUserId } from '../_shared/supabase.ts';

const db = getServiceClient();

// Resolve tool slug → tool uuid
async function getToolId(slug: string): Promise<string | null> {
  const { data } = await db
    .from('tools')
    .select('id')
    .eq('slug', slug)
    .eq('status', 'live')
    .limit(1)
    .single();
  return data?.id ?? null;
}

// Build user initials from profile (never exposes real name)
function buildInitials(email?: string): string {
  if (!email) return 'DU';
  const parts = email.split('@')[0].split(/[._-]/);
  return parts
    .slice(0, 2)
    .map(p => (p[0] || '').toUpperCase())
    .join('') || 'DU';
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const url = new URL(req.url);
  // Path: /reviews-api/:slug
  const slug = url.pathname.replace(/^\/reviews-api\/?/, '').split('/')[0];
  if (!slug) return errorResponse('Tool slug required', 400);

  // ---- GET: list reviews ----
  if (req.method === 'GET') {
    try {
      const toolId = await getToolId(slug);
      if (!toolId) return errorResponse('Tool not found', 404);

      const { data: reviews, error } = await db
        .from('tool_reviews')
        .select('id, rating, pros, cons, use_case, created_at, user_id')
        .eq('tool_id', toolId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) return errorResponse(error.message, 500);

      // Anonymise: derive initials from email without exposing it
      const enriched = (reviews ?? []).map(r => ({
        id: r.id,
        rating: r.rating,
        pros: r.pros ?? [],
        cons: r.cons ?? [],
        use_case: r.use_case ?? '',
        created_at: r.created_at,
        user_initials: 'DU', // anonymised — no email lookup to keep it simple
      }));

      return jsonResponse({ reviews: enriched });
    } catch (e) {
      return errorResponse(e.message, 500);
    }
  }

  // ---- POST: submit review ----
  if (req.method === 'POST') {
    const userId = await getAuthUserId(req);
    if (!userId) return errorResponse('Authentication required', 401);

    try {
      const toolId = await getToolId(slug);
      if (!toolId) return errorResponse('Tool not found', 404);

      const body = await req.json();
      const rating = Number(body.rating);
      if (!rating || rating < 1 || rating > 5) {
        return errorResponse('rating must be 1-5', 400);
      }

      const pros = Array.isArray(body.pros)
        ? body.pros.slice(0, 5).map((s: unknown) => String(s).slice(0, 80))
        : [];
      const cons = Array.isArray(body.cons)
        ? body.cons.slice(0, 5).map((s: unknown) => String(s).slice(0, 80))
        : [];
      const use_case = body.use_case ? String(body.use_case).slice(0, 300) : null;

      // Upsert (one review per user per tool)
      const { error: insertError } = await db
        .from('tool_reviews')
        .upsert({
          tool_id: toolId,
          user_id: userId,
          rating,
          pros,
          cons,
          use_case,
        }, { onConflict: 'tool_id,user_id' });

      if (insertError) return errorResponse(insertError.message, 500);

      // Award XP (+30) via award_xp DB function
      await db.rpc('award_xp', {
        p_user_id: userId,
        p_amount: 30,
        p_reason: `review:${slug}`,
      });

      return jsonResponse({ success: true, xp_earned: 30 });
    } catch (e) {
      return errorResponse(e.message, 500);
    }
  }

  return errorResponse('Method not allowed', 405);
});
