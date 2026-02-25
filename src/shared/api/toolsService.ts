// ============================================
// Delta — Tools Service
// Tries Supabase edge function first, falls back to CURATED_TOOLS
// App works fully without Supabase configured.
// ============================================

import { ToolData, ReviewData } from '../types/types';
import { supabase, IS_CONFIGURED } from './supabaseClient';
import { CURATED_TOOLS } from './deltaService';
import { storageService } from '../../entities/user/storageService';

const EDGE_BASE = IS_CONFIGURED
    ? (import.meta.env.VITE_SUPABASE_URL + '/functions/v1')
    : '';

async function edgeCall<T>(path: string, body?: Record<string, unknown>): Promise<T | null> {
    if (!IS_CONFIGURED) return null;
    try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const res = await fetch(`${EDGE_BASE}${path}`, {
            method: body ? 'POST' : 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
        if (!res.ok) return null;
        return await res.json() as T;
    } catch {
        return null;
    }
}

// Transform Supabase tool row → ToolData for UI
function mapDbTool(t: Record<string, any>): ToolData {
    const pricing = (() => {
        if (t.pricing_model === 'free') return { model: 'free' as const };
        if (t.pricing_model === 'paid') return { model: 'paid' as const, startingPrice: t.price_from ? `$${t.price_from}/mo` : undefined };
        return { model: 'freemium' as const, freeDetails: 'Free tier available' };
    })();

    return {
        id: t.id || t.slug,
        name: t.name,
        description: t.tagline || t.description || '',
        category: t.tasks?.[0]?.name || 'General',
        tag: (t.tasks?.[0]?.slug || 'general').replace(/-/g, ' '),
        domain: t.website_url ? new URL(t.website_url).hostname.replace('www.', '') : t.slug,
        url: t.website_url || `https://${t.slug}.com`,
        matchScore: Math.round((t.match_score || 0) * 10) || 50,
        mastery: t.mastery_level || 0,
        isNew: t.created_at ? (Date.now() - new Date(t.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000 : false,
        logoUrl: t.logo_url || `https://www.google.com/s2/favicons?domain=${t.slug}.com&sz=128`,
        deltaAnalysis: t.delta_analysis,
        useCases: t.use_cases || [],
        bestFor: t.best_for || [],
        pricing,
    };
}

/**
 * Get all tools — DB if configured, else curated fallback
 */
export async function getTools(userRole?: string): Promise<ToolData[]> {
    if (!IS_CONFIGURED) {
        return CURATED_TOOLS;
    }

    const user = storageService.getUser();
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user?.id;

    // Try personalised match first if user is logged in
    if (userId) {
        const data = await edgeCall<{ tools: Record<string, any>[] }>('/tools-api/match');
        if (data?.tools?.length) return data.tools.map(mapDbTool);
    }

    // Fall back to trending
    const data = await edgeCall<{ tools: Record<string, any>[] }>('/tools-api/trending');
    if (data?.tools?.length) return data.tools.map(mapDbTool);

    return CURATED_TOOLS;
}

/**
 * Search tools — DB full-text if configured, else local filter
 */
export async function searchTools(query: string): Promise<ToolData[]> {
    if (!query.trim()) return getTools();

    if (IS_CONFIGURED) {
        const data = await edgeCall<{ tools: Record<string, any>[] }>(`/tools-api?q=${encodeURIComponent(query)}`);
        if (data?.tools?.length) return data.tools.map(mapDbTool);
    }

    // Local fallback: simple name/description filter
    const q = query.toLowerCase();
    return CURATED_TOOLS.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
}

/**
 * Get trending tools
 */
export async function getTrendingTools(): Promise<ToolData[]> {
    if (IS_CONFIGURED) {
        const data = await edgeCall<{ tools: Record<string, any>[] }>('/tools-api/trending');
        if (data?.tools?.length) return data.tools.slice(0, 10).map(mapDbTool);
    }
    return CURATED_TOOLS.slice(0, 10);
}

/**
 * Get new tools (last 7 days from DB)
 */
export async function getNewTools(): Promise<ToolData[]> {
    if (IS_CONFIGURED) {
        const data = await edgeCall<{ tools: Record<string, any>[] }>('/tools-api/new');
        if (data?.tools?.length) return data.tools.map(mapDbTool);
    }
    return CURATED_TOOLS.filter(t => t.isNew).slice(0, 6);
}

/**
 * Get full tool detail by slug
 */
export async function getToolDetail(slug: string): Promise<ToolData | null> {
    if (IS_CONFIGURED) {
        const data = await edgeCall<Record<string, any>>(`/tools-api/${slug}`);
        if (data?.id) return mapDbTool(data);
    }
    return CURATED_TOOLS.find(t => t.id === slug || t.name.toLowerCase() === slug.toLowerCase()) || null;
}

/**
 * Get tool releases by slug
 */
export async function getToolReleases(slug: string): Promise<{ version: string; date: string; notes: string[] }[]> {
    if (!IS_CONFIGURED) return [];
    const data = await edgeCall<{ releases: Record<string, any>[] }>(`/tools-api/${slug}/releases`);
    if (!data?.releases?.length) return [];
    return data.releases.map(r => ({
        version: r.version || 'v1.0',
        date: r.release_date || r.created_at || '',
        notes: r.changelog || [],
    }));
}

/**
 * Get tool alternatives by slug
 */
export async function getToolAlternatives(slug: string): Promise<ToolData[]> {
    if (!IS_CONFIGURED) return [];
    const data = await edgeCall<{ alternatives: Record<string, any>[] }>(`/tools-api/${slug}/alternatives`);
    if (!data?.alternatives?.length) return [];
    return data.alternatives.map(a => mapDbTool(a.tool || a));
}

/**
 * Toggle tool save (requires auth)
 */
export async function toggleToolSave(slug: string): Promise<boolean> {
    const isSaved = storageService.toggleToolSave(slug);
    if (IS_CONFIGURED) {
        await edgeCall(`/tools-api/${slug}/save`, {});
    }
    return isSaved;
}

/**
 * Get reviews for a tool
 */
export async function getToolReviews(slug: string): Promise<ReviewData[]> {
    if (!IS_CONFIGURED) return [];
    const data = await edgeCall<{ reviews: Record<string, any>[] }>(`/reviews-api/${slug}`);
    if (!data?.reviews?.length) return [];
    return data.reviews.map(r => ({
        id: r.id,
        rating: r.rating || 3,
        pros: r.pros || [],
        cons: r.cons || [],
        use_case: r.use_case || '',
        created_at: r.created_at || '',
        user_initials: r.user_initials || 'DU',
    }));
}

/**
 * Submit a tool review (requires auth) — awards +30 XP
 */
export async function submitToolReview(
    slug: string,
    review: { rating: number; pros: string[]; cons: string[]; use_case: string },
): Promise<{ success: boolean; xpEarned: number }> {
    if (!IS_CONFIGURED) return { success: false, xpEarned: 0 };
    const data = await edgeCall<{ success: boolean; xp_earned: number }>(
        `/reviews-api/${slug}`,
        { rating: review.rating, pros: review.pros, cons: review.cons, use_case: review.use_case },
    );
    if (!data?.success) return { success: false, xpEarned: 0 };
    return { success: true, xpEarned: data.xp_earned || 30 };
}
