// ============================================================
// Delta AI — News API Edge Function
// Routes: GET /news, GET /news/hero, GET /news/:id
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const route = pathParts.slice(1);

  try {
    const db = getServiceClient();

    // ---- GET /news/hero (today's top FOMO item) ----
    if (req.method === 'GET' && route[0] === 'hero') {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await db
        .from('news_items')
        .select('*, tools:related_tool_id(slug, name, logo_url)')
        .gte('published_at', dayAgo)
        .order('fomo_score', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        // Fallback: get most recent featured item
        const { data: featured } = await db
          .from('news_items')
          .select('*, tools:related_tool_id(slug, name, logo_url)')
          .eq('is_featured', true)
          .order('published_at', { ascending: false })
          .limit(1)
          .single();
        return jsonResponse(featured || null);
      }

      return jsonResponse(data);
    }

    // ---- GET /news/:id ----
    if (req.method === 'GET' && route.length === 1) {
      const { data, error } = await db
        .from('news_items')
        .select('*, tools:related_tool_id(slug, name, logo_url, tagline)')
        .eq('id', route[0])
        .single();

      if (error || !data) return errorResponse('News item not found', 404);
      return jsonResponse(data);
    }

    // ---- GET /news?cursor=...&type=...&limit=... ----
    if (req.method === 'GET' && route.length === 0) {
      const cursor = url.searchParams.get('cursor'); // ISO date string for pagination
      const type = url.searchParams.get('type');
      const limit = parseInt(url.searchParams.get('limit') || '20');

      let query = db
        .from('news_items')
        .select('id, headline, summary, delta_summary, source_name, source_url, source_logo, news_type, fomo_score, actionability, published_at, is_featured, related_tool_id, tools:related_tool_id(slug, name, logo_url)')
        .order('published_at', { ascending: false })
        .limit(limit);

      if (cursor) {
        query = query.lt('published_at', cursor);
      }

      if (type) {
        query = query.eq('news_type', type);
      }

      const { data, error } = await query;
      if (error) return errorResponse(error.message, 500);

      // Return with next cursor
      const items = data || [];
      const nextCursor = items.length === limit ? items[items.length - 1].published_at : null;

      return jsonResponse({
        items,
        next_cursor: nextCursor,
        has_more: items.length === limit,
      });
    }

    return errorResponse('Not found', 404);
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});
