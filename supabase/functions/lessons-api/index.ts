// ============================================================
// Delta AI — Lessons API Edge Function
// Routes: GET /lessons, GET /lessons/:id, POST /lessons/:id/complete,
//         GET /lessons/recommended
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

    // ---- GET /lessons/recommended (auth required) ----
    if (req.method === 'GET' && route[0] === 'recommended') {
      const userId = await getAuthUserId(req);
      if (!userId) return errorResponse('Unauthorized', 401);

      // Get user's completed lessons
      const { data: completions } = await db
        .from('user_lesson_completions')
        .select('lesson_id')
        .eq('user_id', userId);
      const completedIds = (completions || []).map((c: any) => c.lesson_id);

      // Get user profile for personalisation
      const { data: profile } = await db
        .from('user_profiles')
        .select('skill_level, preferred_categories, tools_known')
        .eq('id', userId)
        .single();

      // Get lessons not yet completed, ordered by difficulty
      let query = db
        .from('lessons')
        .select('id, title, summary, difficulty, duration_mins, xp_reward, pill_label, tool_id, tools(slug, name, logo_url)')
        .order('difficulty', { ascending: true })
        .limit(10);

      if (completedIds.length > 0) {
        query = query.not('id', 'in', `(${completedIds.join(',')})`);
      }

      // Filter by difficulty based on skill level
      if (profile?.skill_level === 'beginner') {
        query = query.lte('difficulty', 2);
      }

      const { data, error } = await query;
      if (error) return errorResponse(error.message, 500);
      return jsonResponse(data || []);
    }

    // ---- POST /lessons/:id/complete (auth required) ----
    if (req.method === 'POST' && route.length === 2 && route[1] === 'complete') {
      const userId = await getAuthUserId(req);
      if (!userId) return errorResponse('Unauthorized', 401);

      const lessonId = route[0];

      // Get the lesson's XP reward
      const { data: lesson } = await db
        .from('lessons')
        .select('xp_reward')
        .eq('id', lessonId)
        .single();

      if (!lesson) return errorResponse('Lesson not found', 404);

      // Award XP and record completion (handled by DB function)
      const { data, error } = await db.rpc('award_xp', {
        p_user_id: userId,
        p_lesson_id: lessonId,
        p_xp: lesson.xp_reward || 50,
      });

      if (error) return errorResponse(error.message, 500);

      // Update streak
      const streak = await db.rpc('update_user_streak', { p_user_id: userId });

      const result = data?.[0] || {};
      return jsonResponse({
        ...result,
        streak: streak.data,
      });
    }

    // ---- GET /lessons/:id (single lesson with full content) ----
    if (req.method === 'GET' && route.length === 1) {
      const { data, error } = await db
        .from('lessons')
        .select(`
          *,
          tools(slug, name, logo_url, tagline)
        `)
        .eq('id', route[0])
        .single();

      if (error || !data) return errorResponse('Lesson not found', 404);
      return jsonResponse(data);
    }

    // ---- GET /lessons?tool=...&task=...&difficulty=... ----
    if (req.method === 'GET' && route.length === 0) {
      const toolSlug = url.searchParams.get('tool');
      const taskSlug = url.searchParams.get('task');
      const difficulty = url.searchParams.get('difficulty');
      const limit = parseInt(url.searchParams.get('limit') || '20');

      let query = db
        .from('lessons')
        .select('id, title, summary, difficulty, duration_mins, xp_reward, pill_label, source_type, tool_id, tools(slug, name, logo_url)')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (toolSlug) {
        const { data: tool } = await db.from('tools').select('id').eq('slug', toolSlug).single();
        if (tool) query = query.eq('tool_id', tool.id);
      }

      if (taskSlug) {
        const { data: task } = await db.from('tasks').select('id').eq('slug', taskSlug).single();
        if (task) query = query.eq('task_id', task.id);
      }

      if (difficulty) {
        query = query.eq('difficulty', parseInt(difficulty));
      }

      const { data, error } = await query;
      if (error) return errorResponse(error.message, 500);
      return jsonResponse(data || []);
    }

    return errorResponse('Not found', 404);
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});
