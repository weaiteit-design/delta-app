// ============================================
// Delta — Lessons Service
// Tries Supabase edge function first, falls back gracefully
// App works without Supabase (lessons generated dynamically via Gemini)
// ============================================

import { LessonData } from '../types/types';
import { supabase, IS_CONFIGURED } from './supabaseClient';
import { storageService } from '../../entities/user/storageService';

const EDGE_BASE = IS_CONFIGURED
    ? (import.meta.env.VITE_SUPABASE_URL + '/functions/v1')
    : '';

async function edgeGet<T>(path: string): Promise<T | null> {
    if (!IS_CONFIGURED) return null;
    try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const res = await fetch(`${EDGE_BASE}${path}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
        if (!res.ok) return null;
        return await res.json() as T;
    } catch {
        return null;
    }
}

async function edgePost<T>(path: string, body: Record<string, unknown>): Promise<T | null> {
    if (!IS_CONFIGURED) return null;
    try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const res = await fetch(`${EDGE_BASE}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) return null;
        return await res.json() as T;
    } catch {
        return null;
    }
}

// Map DB lesson row → LessonData
function mapDbLesson(l: Record<string, any>): LessonData {
    const difficultyNum = l.difficulty || 2;
    const difficultyLabel = difficultyNum === 1 ? 'Beginner' : difficultyNum === 3 ? 'Advanced' : 'Intermediate';

    return {
        id: l.id,
        title: l.title,
        category: l.tasks?.name || l.tools?.name || 'AI Learning',
        duration: l.duration_mins ? `${l.duration_mins} min` : '3 min',
        xp: l.xp_reward || 50,
        difficulty: difficultyNum,
        preview: l.summary || l.steps?.[0]?.content || '',
        pill: l.pill_label || difficultyLabel.toUpperCase() + ' LESSON',
        steps: Array.isArray(l.steps) ? l.steps.map((s: any) => s.content || s) : [],
        practiceTask: l.practice_task || undefined,
        taskPrompt: l.task_prompt || undefined,
    };
}

export interface LessonFilters {
    difficulty?: number;
    toolSlug?: string;
    taskSlug?: string;
    limit?: number;
}

/**
 * Get lessons list — DB if configured, else empty (dynamically generated)
 */
export async function getLessons(filters: LessonFilters = {}): Promise<LessonData[]> {
    if (!IS_CONFIGURED) return [];

    const params = new URLSearchParams();
    if (filters.difficulty) params.set('difficulty', String(filters.difficulty));
    if (filters.toolSlug) params.set('tool', filters.toolSlug);
    if (filters.taskSlug) params.set('task', filters.taskSlug);
    if (filters.limit) params.set('limit', String(filters.limit));

    const data = await edgeGet<Record<string, any>[]>(`/lessons-api?${params}`);
    if (!data?.length) return [];
    return data.map(mapDbLesson);
}

/**
 * Get recommended lessons for current user
 */
export async function getRecommendedLessons(): Promise<LessonData[]> {
    if (!IS_CONFIGURED) return [];
    const data = await edgeGet<Record<string, any>[]>('/lessons-api/recommended');
    if (!data?.length) return [];
    return data.map(mapDbLesson);
}

/**
 * Get full lesson detail
 */
export async function getLesson(id: string): Promise<LessonData | null> {
    if (!IS_CONFIGURED) return null;
    const data = await edgeGet<Record<string, any>>(`/lessons-api/${id}`);
    if (!data?.id) return null;
    return mapDbLesson(data);
}

/**
 * Mark lesson as complete — writes to DB if configured, always writes to local storage
 */
export async function completeLesson(lessonId: string, xpAmount: number): Promise<{
    leveledUp: boolean;
    newLevel?: string;
    newXp: number;
}> {
    // Always update local state
    const { user, leveledUp } = storageService.addXP(xpAmount, lessonId);

    // Sync to DB if configured
    if (IS_CONFIGURED) {
        await edgePost(`/lessons-api/${lessonId}/complete`, {});
    }

    return {
        leveledUp,
        newLevel: leveledUp ? user.levelTitle : undefined,
        newXp: user.xp,
    };
}
