// ============================================================
// Delta AI — User API Edge Function
// Routes: GET/PUT /profile, POST /onboarding,
//         GET /saved-tools, GET /skill-stack, GET /streak
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
    const userId = await getAuthUserId(req);
    if (!userId) return errorResponse('Unauthorized', 401);

    // ---- GET /user/profile ----
    if (req.method === 'GET' && (route.length === 0 || route[0] === 'profile')) {
      const { data, error } = await db
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        // Create profile if it doesn't exist
        const { data: newProfile, error: insertErr } = await db
          .from('user_profiles')
          .insert({ id: userId })
          .select()
          .single();
        if (insertErr) return errorResponse(insertErr.message, 500);
        return jsonResponse(newProfile);
      }

      return jsonResponse(data);
    }

    // ---- PUT /user/profile ----
    if (req.method === 'PUT' && (route.length === 0 || route[0] === 'profile')) {
      const body = await req.json();

      // Whitelist allowed fields
      const allowedFields = [
        'display_name', 'role', 'industry', 'goals', 'skill_level',
        'ai_level', 'preferred_categories', 'tools_known', 'learning_style',
        'avatar_url',
      ];
      const updates: Record<string, any> = {};
      for (const key of allowedFields) {
        if (body[key] !== undefined) updates[key] = body[key];
      }

      const { data, error } = await db
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) return errorResponse(error.message, 500);
      return jsonResponse(data);
    }

    // ---- POST /user/onboarding ----
    if (req.method === 'POST' && route[0] === 'onboarding') {
      const body = await req.json();

      const { data, error } = await db
        .from('user_profiles')
        .upsert({
          id: userId,
          display_name: body.display_name,
          role: body.role,
          industry: body.industry,
          goals: body.goals || [],
          skill_level: body.skill_level || 'beginner',
          ai_level: body.ai_level || 'Beginner',
          preferred_categories: body.preferred_categories || [],
          tools_known: body.tools_known || [],
          learning_style: body.learning_style,
          onboarded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) return errorResponse(error.message, 500);

      // Auto-follow tasks related to preferred categories
      if (body.preferred_categories?.length) {
        const categoryToTask: Record<string, string> = {
          'AI Writing': 'ai-writing',
          'AI Images': 'ai-image-generation',
          'Coding Copilots': 'ai-coding',
          'AI Research': 'ai-research',
          'Video & Audio': 'ai-video',
          'Career & Biz': 'ai-productivity',
        };
        for (const cat of body.preferred_categories) {
          const taskSlug = categoryToTask[cat];
          if (taskSlug) {
            const { data: task } = await db.from('tasks').select('id').eq('slug', taskSlug).single();
            if (task) {
              await db.from('user_task_follows').upsert({
                user_id: userId,
                task_id: task.id,
              });
            }
          }
        }
      }

      return jsonResponse({ profile: data, onboarded: true });
    }

    // ---- GET /user/saved-tools ----
    if (req.method === 'GET' && route[0] === 'saved-tools') {
      const { data, error } = await db
        .from('user_tool_saves')
        .select('saved_at, tools(id, slug, name, tagline, logo_url, pricing_model, has_free_tier, views_count)')
        .eq('user_id', userId)
        .order('saved_at', { ascending: false });

      if (error) return errorResponse(error.message, 500);

      const tools = (data || []).map((r: any) => ({
        ...r.tools,
        saved_at: r.saved_at,
      }));
      return jsonResponse(tools);
    }

    // ---- GET /user/skill-stack ----
    if (req.method === 'GET' && route[0] === 'skill-stack') {
      // Get mastery progress per tool
      const { data: mastery } = await db
        .from('user_tool_mastery')
        .select('mastery_level, lessons_done, last_practiced, tools(slug, name, logo_url)')
        .eq('user_id', userId)
        .order('mastery_level', { ascending: false });

      // Get followed tasks
      const { data: follows } = await db
        .from('user_task_follows')
        .select('tasks(slug, name, emoji, tool_count)')
        .eq('user_id', userId);

      // Get lesson completion stats
      const { data: completions } = await db
        .from('user_lesson_completions')
        .select('lesson_id, xp_earned, completed_at')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(50);

      return jsonResponse({
        tool_mastery: mastery || [],
        followed_tasks: (follows || []).map((f: any) => f.tasks),
        recent_completions: completions || [],
        total_lessons: (completions || []).length,
        total_xp: (completions || []).reduce((sum: number, c: any) => sum + (c.xp_earned || 0), 0),
      });
    }

    // ---- GET /user/streak ----
    if (req.method === 'GET' && route[0] === 'streak') {
      const { data: profile } = await db
        .from('user_profiles')
        .select('xp, streak_days, level, level_title, last_active, lessons_completed')
        .eq('id', userId)
        .single();

      if (!profile) return errorResponse('Profile not found', 404);

      // Calculate XP to next level
      const LEVELS = [
        { level: 1, title: 'Observer', xp: 0 },
        { level: 2, title: 'Explorer', xp: 50 },
        { level: 3, title: 'Builder', xp: 150 },
        { level: 4, title: 'Architect', xp: 300 },
        { level: 5, title: 'Visionary', xp: 600 },
        { level: 6, title: 'Oracle', xp: 1000 },
      ];

      const currentIdx = LEVELS.findIndex(l => l.level === profile.level);
      const nextLevel = LEVELS[currentIdx + 1];

      return jsonResponse({
        ...profile,
        xp_to_next: nextLevel ? nextLevel.xp - profile.xp : 0,
        next_level_title: nextLevel?.title ?? 'Max Level',
        next_level_xp: nextLevel?.xp ?? profile.xp,
      });
    }

    return errorResponse('Not found', 404);
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});
