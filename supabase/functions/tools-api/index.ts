// ============================================================
// Delta AI — Tools API Edge Function
// Routes: GET /tools, GET /tools/:slug, POST /tools/:slug/save,
//         GET /tools/trending, GET /tools/new, GET /tools/match
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getServiceClient, getUserClient, getAuthUserId } from '../_shared/supabase.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // pathParts: ["tools-api", ...rest]
  const route = pathParts.slice(1); // everything after "tools-api"

  try {
    const db = getServiceClient();

    // ---- GET /tools/trending ----
    if (req.method === 'GET' && route[0] === 'trending') {
      const { data, error } = await db
        .from('tools')
        .select('id, slug, name, tagline, logo_url, pricing_model, has_free_tier, views_count, trending_rank, platforms')
        .eq('status', 'live')
        .not('trending_rank', 'is', null)
        .order('trending_rank', { ascending: true })
        .limit(50);

      if (error) return errorResponse(error.message, 500);
      return jsonResponse(data);
    }

    // ---- GET /tools/new ----
    if (req.method === 'GET' && route[0] === 'new') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await db
        .from('tools')
        .select('id, slug, name, tagline, logo_url, pricing_model, has_free_tier, views_count, platforms, created_at')
        .eq('status', 'live')
        .gte('created_at', weekAgo)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) return errorResponse(error.message, 500);
      return jsonResponse(data);
    }

    // ---- GET /tools/match (auth required) ----
    if (req.method === 'GET' && route[0] === 'match') {
      const userId = await getAuthUserId(req);
      if (!userId) return errorResponse('Unauthorized', 401);

      const { data, error } = await db.rpc('calculate_match_scores', { p_user_id: userId });
      if (error) return errorResponse(error.message, 500);

      // Enrich with tool details
      const toolIds = (data || []).slice(0, 30).map((r: any) => r.tool_id);
      const { data: tools } = await db
        .from('tools')
        .select('id, slug, name, tagline, logo_url, pricing_model, has_free_tier, views_count, platforms, delta_analysis, best_for')
        .in('id', toolIds);

      const scoreMap = new Map((data || []).map((r: any) => [r.tool_id, r.match_score]));
      const enriched = (tools || []).map(t => ({
        ...t,
        match_score: scoreMap.get(t.id) || 0,
      })).sort((a: any, b: any) => b.match_score - a.match_score);

      return jsonResponse(enriched);
    }

    // ---- GET /tools/:slug/releases ----
    if (req.method === 'GET' && route.length === 2 && route[1] === 'releases') {
      const { data, error } = await db
        .from('releases')
        .select('*')
        .eq('tool_id', (await db.from('tools').select('id').eq('slug', route[0]).single()).data?.id)
        .order('release_date', { ascending: false });

      if (error) return errorResponse(error.message, 500);
      return jsonResponse(data || []);
    }

    // ---- GET /tools/:slug/alternatives ----
    if (req.method === 'GET' && route.length === 2 && route[1] === 'alternatives') {
      const toolRes = await db.from('tools').select('id').eq('slug', route[0]).single();
      if (!toolRes.data) return errorResponse('Tool not found', 404);

      const { data, error } = await db
        .from('alternatives')
        .select('alt_tool_id, similarity_score, is_featured, tools!alternatives_alt_tool_id_fkey(slug, name, tagline, logo_url, pricing_model)')
        .eq('tool_id', toolRes.data.id)
        .order('similarity_score', { ascending: false })
        .limit(10);

      if (error) return errorResponse(error.message, 500);
      return jsonResponse(data || []);
    }

    // ---- GET /tools/:slug/lessons ----
    if (req.method === 'GET' && route.length === 2 && route[1] === 'lessons') {
      const toolRes = await db.from('tools').select('id').eq('slug', route[0]).single();
      if (!toolRes.data) return errorResponse('Tool not found', 404);

      const { data, error } = await db
        .from('lessons')
        .select('id, title, summary, difficulty, duration_mins, xp_reward, pill_label')
        .eq('tool_id', toolRes.data.id)
        .order('difficulty', { ascending: true });

      if (error) return errorResponse(error.message, 500);
      return jsonResponse(data || []);
    }

    // ---- POST /tools/:slug/save (auth required) ----
    if (req.method === 'POST' && route.length === 2 && route[1] === 'save') {
      const userId = await getAuthUserId(req);
      if (!userId) return errorResponse('Unauthorized', 401);

      const toolRes = await db.from('tools').select('id').eq('slug', route[0]).single();
      if (!toolRes.data) return errorResponse('Tool not found', 404);

      // Toggle: check if already saved
      const { data: existing } = await db
        .from('user_tool_saves')
        .select('id')
        .eq('user_id', userId)
        .eq('tool_id', toolRes.data.id)
        .single();

      if (existing) {
        await db.from('user_tool_saves').delete().eq('id', existing.id);
        return jsonResponse({ saved: false });
      } else {
        await db.from('user_tool_saves').insert({ user_id: userId, tool_id: toolRes.data.id });
        return jsonResponse({ saved: true });
      }
    }

    // ---- GET /tools/:slug (single tool detail) ----
    if (req.method === 'GET' && route.length === 1 && route[0] !== 'search') {
      const { data, error } = await db
        .from('tools')
        .select(`
          *,
          organisations(name, slug, logo_url, website_url),
          tool_tasks(task_id, is_primary, tasks(slug, name, emoji))
        `)
        .eq('slug', route[0])
        .single();

      if (error || !data) return errorResponse('Tool not found', 404);

      // Record view if user is authenticated
      const userId = await getAuthUserId(req);
      if (userId) {
        await db.from('tool_views').insert({ tool_id: data.id, user_id: userId });
      }

      return jsonResponse(data);
    }

    // ---- GET /tools?q=...&task=...&pricing=...&platform=...&sort=...&limit=...&offset=... ----
    if (req.method === 'GET' && route.length === 0) {
      const q = url.searchParams.get('q');
      const task = url.searchParams.get('task');
      const pricing = url.searchParams.get('pricing');
      const platform = url.searchParams.get('platform');
      const sort = url.searchParams.get('sort') || 'views';
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      // If there's a search query, use the search function
      if (q) {
        // For search, we call the search_tools function (without embedding for now)
        const { data, error } = await db.rpc('search_tools', {
          p_query: q,
          p_user_id: null,
          p_task_slug: task,
          p_pricing: pricing,
          p_platform: platform,
          p_limit: limit,
          p_offset: offset,
          p_embedding: null,
        });
        if (error) return errorResponse(error.message, 500);
        return jsonResponse(data || []);
      }

      // No search query — list tools with filters
      let query = db
        .from('tools')
        .select('id, slug, name, tagline, logo_url, pricing_model, has_free_tier, views_count, trending_rank, platforms, delta_analysis, best_for, created_at')
        .eq('status', 'live');

      if (pricing) query = query.eq('pricing_model', pricing);
      if (platform) query = query.contains('platforms', [platform]);

      // Filter by task category
      if (task) {
        const { data: taskTools } = await db
          .from('tool_tasks')
          .select('tool_id, tasks!inner(slug)')
          .eq('tasks.slug', task);
        const ids = (taskTools || []).map((t: any) => t.tool_id);
        if (ids.length > 0) query = query.in('id', ids);
        else return jsonResponse([]);
      }

      // Sort
      if (sort === 'trending') query = query.order('trending_rank', { ascending: true, nullsFirst: false });
      else if (sort === 'newest') query = query.order('created_at', { ascending: false });
      else if (sort === 'name') query = query.order('name', { ascending: true });
      else query = query.order('views_count', { ascending: false });

      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;
      if (error) return errorResponse(error.message, 500);
      return jsonResponse(data || []);
    }

    return errorResponse('Not found', 404);
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});
