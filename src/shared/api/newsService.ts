// ============================================
// Delta — News Service
// Tries Supabase news-api edge function first,
// falls back to local contentPipeline
// ============================================

import { VerifiedUpdate } from '../types/types';
import { supabase, IS_CONFIGURED } from './supabaseClient';
import { contentPipeline } from '../../entities/news/contentPipeline';

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

// Map DB news_item → VerifiedUpdate for UI
// NOTE: source_url is kept for deep linking, but source_name is NOT surfaced
function mapDbNews(n: Record<string, any>): VerifiedUpdate {
    const typeMap: Record<string, VerifiedUpdate['type']> = {
        capability: 'capability',
        'new-tool': 'new-tool',
        'tool-update': 'tool-update',
        trick: 'trick',
        workflow: 'workflow',
    };

    const newsType: VerifiedUpdate['type'] = typeMap[n.news_type] || 'tool-update';

    const tagMap: Record<string, string> = {
        capability: 'AI CAPABILITY',
        'new-tool': 'NEW TOOL',
        'tool-update': 'TOOL UPDATE',
        trick: 'AI TRICK',
        workflow: 'WORKFLOW',
    };

    const timeAgo = (() => {
        if (!n.published_at) return 'Recently';
        const diff = Date.now() - new Date(n.published_at).getTime();
        const h = Math.floor(diff / 3600000);
        if (h < 1) return 'Just now';
        if (h < 24) return `${h}h ago`;
        return `${Math.floor(h / 24)}d ago`;
    })();

    return {
        id: n.id,
        title: n.headline || n.title || '',
        shortSummary: n.delta_summary || n.summary || '',
        type: newsType,
        tag: tagMap[n.news_type] || 'DELTA UPDATE',
        source: 'Delta Intelligence',         // Never expose raw source name
        sourceDomain: 'delta.app',            // Never expose raw source domain
        timeAgo,
        fomoScore: n.fomo_score || 5,
        url: n.source_url || undefined,       // URL kept for deep-link "Read More"
        publishedAt: n.published_at || new Date().toISOString(),
        actionability: n.actionability || 5,
    };
}

/**
 * Get news feed — DB if configured, else contentPipeline
 * DB response is already Delta-branded (source hidden)
 */
export async function getNewsFeed(cursor?: string): Promise<{ items: VerifiedUpdate[]; nextCursor?: string }> {
    if (IS_CONFIGURED) {
        const params = cursor ? `?cursor=${cursor}&limit=20` : '?limit=20';
        const data = await edgeGet<{ items: Record<string, any>[]; next_cursor?: string }>(`/news-api${params}`);
        if (data?.items?.length) {
            return {
                items: data.items.map(mapDbNews),
                nextCursor: data.next_cursor || undefined,
            };
        }
    }

    // Fallback: use local content pipeline
    const items = await contentPipeline.getUpdates();
    return { items };
}

/**
 * Get hero item (highest FOMO from last 24h) — DB if configured
 */
export async function getHeroItem(): Promise<VerifiedUpdate | null> {
    if (IS_CONFIGURED) {
        const data = await edgeGet<Record<string, any>>('/news-api/hero');
        if (data?.id) return mapDbNews(data);
    }
    // Fallback: get top item from local pipeline
    const items = await contentPipeline.getUpdates();
    return items.sort((a, b) => b.fomoScore - a.fomoScore)[0] || null;
}
