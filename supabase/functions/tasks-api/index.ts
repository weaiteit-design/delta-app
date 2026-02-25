// ============================================================
// Delta AI — Tasks API Edge Function
// Routes: GET /tasks, GET /tasks/:slug, GET /tasks/:slug/tools,
//         POST /tasks/follow
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getServiceClient, getAuthUserId } from '../_shared/supabase.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const route = pathParts.slice(1);

  try {
    const db = getServiceClient();

    // ---- POST /tasks/follow (auth required) ----
    if (req.method === 'POST' && route[0] === 'follow') {
      const userId = await getAuthUserId(req);
      if (!userId) return errorResponse('Unauthorized', 401);

      const body = await req.json();
      const taskSlug = body.task_slug;
      if (!taskSlug) return errorResponse('task_slug required', 400);

      const taskRes = await db.from('tasks').select('id').eq('slug', taskSlug).single();
      if (!taskRes.data) return errorResponse('Task not found', 404);

      // Toggle follow
      const { data: existing } = await db
        .from('user_task_follows')
        .select('user_id')
        .eq('user_id', userId)
        .eq('task_id', taskRes.data.id)
        .single();

      if (existing) {
        await db.from('user_task_follows').delete()
          .eq('user_id', userId)
          .eq('task_id', taskRes.data.id);
        return jsonResponse({ following: false });
      } else {
        await db.from('user_task_follows').insert({
          user_id: userId,
          task_id: taskRes.data.id,
        });
        return jsonResponse({ following: true });
      }
    }

    // ---- GET /tasks/:slug/tools ----
    if (req.method === 'GET' && route.length === 2 && route[1] === 'tools') {
      const taskRes = await db.from('tasks').select('id').eq('slug', route[0]).single();
      if (!taskRes.data) return errorResponse('Task not found', 404);

      const { data, error } = await db
        .from('tool_tasks')
        .select('is_primary, tools(id, slug, name, tagline, logo_url, pricing_model, has_free_tier, views_count, platforms)')
        .eq('task_id', taskRes.data.id)
        .order('is_primary', { ascending: false });

      if (error) return errorResponse(error.message, 500);

      const tools = (data || []).map((r: any) => ({
        ...r.tools,
        is_primary: r.is_primary,
      }));
      return jsonResponse(tools);
    }

    // ---- GET /tasks/:slug (single task with subtasks) ----
    if (req.method === 'GET' && route.length === 1) {
      const { data: task, error } = await db
        .from('tasks')
        .select('*')
        .eq('slug', route[0])
        .single();

      if (error || !task) return errorResponse('Task not found', 404);

      // Get subtasks
      const { data: subtasks } = await db
        .from('tasks')
        .select('id, slug, name, emoji, tool_count, sort_order')
        .eq('parent_id', task.id)
        .order('sort_order', { ascending: true });

      return jsonResponse({ ...task, subtasks: subtasks || [] });
    }

    // ---- GET /tasks (all top-level tasks with tool counts) ----
    if (req.method === 'GET' && route.length === 0) {
      const { data, error } = await db
        .from('tasks')
        .select('id, slug, name, emoji, tool_count, sort_order')
        .is('parent_id', null)
        .order('sort_order', { ascending: true });

      if (error) return errorResponse(error.message, 500);
      return jsonResponse(data || []);
    }

    return errorResponse('Not found', 404);
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});
