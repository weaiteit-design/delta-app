// ============================================
// Supabase Client — Official SDK Integration
// Graceful fallback to local-only when credentials are missing
// ============================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const IS_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!IS_CONFIGURED) {
    console.warn('[Supabase] No credentials configured — running in localStorage-only mode');
}

// Create the official client if keys are present
// Fallback to a dummy client structure to prevent runtime null errors when IS_CONFIGURED is false
export const supabase = IS_CONFIGURED
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : ({} as SupabaseClient);

// ============================================
// LEGACY COMPATIBILITY for Caching
// ============================================

export interface CachedContentRow {
    content_hash: string;
    source: string;
    title: string;
    summary: string | null;
    url: string | null;
    raw_data: Record<string, any> | null;
    classified_data: Record<string, any> | null;
    relevance_scores: Record<string, number> | null;
    fetched_at: string;
    expires_at: string;
}

export async function upsertContentCache(row: CachedContentRow): Promise<void> {
    if (!IS_CONFIGURED) return;
    try {
        await supabase.from('content_cache').upsert(row, { onConflict: 'content_hash' });
    } catch (e) {
        console.warn('[Supabase] Upsert failed:', e);
    }
}

export async function batchUpsertContentCache(rows: CachedContentRow[]): Promise<void> {
    if (!IS_CONFIGURED || rows.length === 0) return;
    try {
        await supabase.from('content_cache').upsert(rows, { onConflict: 'content_hash' });
    } catch (e) {
        console.warn('[Supabase] Batch upsert failed:', e);
    }
}

export async function fetchCachedContent(source?: string): Promise<CachedContentRow[]> {
    if (!IS_CONFIGURED) return [];
    try {
        let query = supabase
            .from('content_cache')
            .select('*')
            .gt('expires_at', new Date().toISOString())
            .order('fetched_at', { ascending: false })
            .limit(50);

        if (source) {
            query = query.eq('source', source);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as CachedContentRow[];
    } catch (e) {
        console.warn('[Supabase] Fetch failed:', e);
        return [];
    }
}

export function isSupabaseConfigured(): boolean {
    return IS_CONFIGURED;
}

