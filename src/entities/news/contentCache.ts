// ============================================
// Delta — Content Cache Utility
// Handles localStorage persistence for news and classification
// ============================================

import { RawContentItem, VerifiedUpdate, PipelineStats } from '../../shared/types/types';

export const CACHE_TTL = {
    NEWS: 60 * 60 * 1000, // 1 hour (as requested for hourly updates)
    CLASSIFIED: 7 * 24 * 60 * 60 * 1000, // 7 days for classified items
};

const STORAGE_KEYS = {
    CLASSIFIED: 'delta_classified_items',
    STATS: 'delta_pipeline_stats',
};

/**
 * Deduplicate items by contentHash.
 */
export function deduplicateItems(items: RawContentItem[]): RawContentItem[] {
    const seen = new Set<string>();
    return items.filter(item => {
        if (seen.has(item.contentHash)) return false;
        seen.add(item.contentHash);
        return true;
    });
}

/**
 * Get a single classified item from cache.
 */
export function getClassifiedItem(contentHash: string): VerifiedUpdate | null {
    try {
        const cacheRaw = localStorage.getItem(STORAGE_KEYS.CLASSIFIED);
        if (!cacheRaw) return null;
        const cache = JSON.parse(cacheRaw) as Record<string, { update: VerifiedUpdate; expiresAt: number }>;
        const entry = cache[contentHash];
        if (entry && entry.expiresAt > Date.now()) {
            return entry.update;
        }
    } catch (e) {
        console.warn('[Cache] Get failed:', e);
    }
    return null;
}

/**
 * Batch save classified items.
 */
export function batchSetClassifiedItems(items: { contentHash: string; update: VerifiedUpdate }[]): void {
    try {
        const cacheRaw = localStorage.getItem(STORAGE_KEYS.CLASSIFIED);
        const cache = cacheRaw ? JSON.parse(cacheRaw) : {};

        const expiresAt = Date.now() + CACHE_TTL.CLASSIFIED;
        items.forEach(({ contentHash, update }) => {
            cache[contentHash] = { update, expiresAt };
        });

        localStorage.setItem(STORAGE_KEYS.CLASSIFIED, JSON.stringify(cache));
    } catch (e) {
        console.warn('[Cache] Batch set failed:', e);
    }
}

/**
 * Save pipeline stats.
 */
export function savePipelineStats(stats: PipelineStats): void {
    try {
        localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    } catch (e) { }
}

/**
 * Get pipeline stats.
 */
export function getPipelineStats(): PipelineStats {
    try {
        const stats = localStorage.getItem(STORAGE_KEYS.STATS);
        return stats ? JSON.parse(stats) : {
            lastFetchAt: '',
            sourceCounts: {},
            sourceHealth: {},
            totalRaw: 0,
            totalAfterDedup: 0,
            totalAfterFilter: 0,
            fetchDurationMs: 0,
            cacheHit: false
        };
    } catch (e) {
        return {
            lastFetchAt: '',
            sourceCounts: {},
            sourceHealth: {},
            totalRaw: 0,
            totalAfterDedup: 0,
            totalAfterFilter: 0,
            fetchDurationMs: 0,
            cacheHit: false
        };
    }
}

/**
 * Evict stale items from cache.
 */
export function evictStaleCaches(): void {
    try {
        const cacheRaw = localStorage.getItem(STORAGE_KEYS.CLASSIFIED);
        if (!cacheRaw) return;
        const cache = JSON.parse(cacheRaw) as Record<string, { expiresAt: number }>;
        const now = Date.now();
        const fresh: any = {};

        let evicted = 0;
        Object.entries(cache).forEach(([hash, entry]) => {
            if (entry.expiresAt > now) {
                fresh[hash] = entry;
            } else {
                evicted++;
            }
        });

        if (evicted > 0) {
            localStorage.setItem(STORAGE_KEYS.CLASSIFIED, JSON.stringify(fresh));
        }
    } catch (e) { }
}
