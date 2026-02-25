// ============================================
// Delta — Content Pipeline Orchestrator
// Coordinates all sources → dedup → classify → cache
// With per-item classified cache, Supabase upsert, and health stats
// ============================================

import { RawContentItem, VerifiedUpdate, PipelineStats } from '../../shared/types/types';
import {
    deduplicateItems,
    CACHE_TTL,
    getClassifiedItem,
    batchSetClassifiedItems,
    savePipelineStats,
    getPipelineStats,
    evictStaleCaches,
} from './contentCache';
import { storageService, UserProfile } from '../user/storageService';
import { deltaService } from '../../shared/api/deltaService';
import { batchUpsertContentCache, CachedContentRow } from '../../shared/api/supabaseClient';
import platformStorage from '../../shared/platform/storage';
import { fetchNewsApiArticles } from './sources/newsApiSource';
import { fetchRedditPosts } from './sources/redditSource';
import { fetchHackerNewsPosts } from './sources/hackerNewsSource';
import { fetchGuardianArticles } from './sources/guardianSource';
import { fetchNewsDataArticles } from './sources/newsDataSource';
import { fetchYouTubeVideos } from './sources/youtubeSource';
import { fetchRssFeeds } from './sources/rssSource';

// ---- Time helpers ----
function timeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function getDomain(url: string): string {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
}

// ---- Type & tag classification (ACTION-ORIENTED, not news-oriented) ----
const TOOL_UPDATE_KEYWORDS = ['update', 'new feature', 'now supports', 'adds', 'improved', 'rolled out', 'v2', 'version', 'upgraded', 'added support', 'now available', 'just launched', 'releases', 'ships'];
const NEW_TOOL_KEYWORDS = ['new tool', 'new app', 'introducing', 'meet', 'just released', 'launched', 'try out', 'open source', 'alternative to', 'free tool'];
const TRICK_KEYWORDS = ['prompt', 'trick', 'hack', 'tip', 'technique', 'try this', 'shortcut', 'secret', 'better results', 'pro tip', 'did you know', 'how i use', 'cheat sheet', 'template'];
const WORKFLOW_KEYWORDS = ['workflow', 'pipeline', 'automate', 'combine', 'integrate', 'step-by-step', 'how to', 'tutorial', 'guide', 'walkthrough', 'setup', 'build with', 'using.*for'];
const CAPABILITY_KEYWORDS = ['can now', 'ability', 'multimodal', 'benchmark', 'context window', 'reasoning', 'new model', 'gpt-5', 'gpt5', 'breakthrough', 'outperforms', 'passes', 'achieves', 'beats'];

function classifyType(title: string, summary: string): { type: VerifiedUpdate['type']; tag: string; emoji: string } {
    const text = (title + ' ' + summary).toLowerCase();
    if (TRICK_KEYWORDS.some(k => text.includes(k))) return { type: 'trick', tag: 'AI TRICK', emoji: '💡' };
    if (WORKFLOW_KEYWORDS.some(k => text.includes(k))) return { type: 'workflow', tag: 'WORKFLOW', emoji: '🔄' };
    if (NEW_TOOL_KEYWORDS.some(k => text.includes(k))) return { type: 'new-tool', tag: 'NEW TOOL', emoji: '🆕' };
    if (CAPABILITY_KEYWORDS.some(k => text.includes(k))) return { type: 'capability', tag: 'AI CAPABILITY', emoji: '🧠' };
    if (TOOL_UPDATE_KEYWORDS.some(k => text.includes(k))) return { type: 'tool-update', tag: 'TOOL UPDATE', emoji: '🔧' };
    return { type: 'tool-update', tag: 'TOOL UPDATE', emoji: '🔧' }; // default to tool-update instead of generic "update"
}

// ---- Actionability score (0-10): can the user DO something with this?) ----
function computeActionability(item: RawContentItem, type: VerifiedUpdate['type']): number {
    let score = 3; // base score gives valid items a fighting chance to pass threshold.
    const text = (item.title + ' ' + item.summary).toLowerCase();

    // Type-based baseline
    if (type === 'trick') score += 5;       // tricks are highly actionable
    if (type === 'workflow') score += 4;    // workflows teach processes
    if (type === 'new-tool') score += 4;    // new tools can be tried
    if (type === 'tool-update') score += 3; // updates inform usage
    if (type === 'capability') score += 2;  // capabilities are informational

    // Actionable language boost
    const actionWords = ['try', 'use', 'build', 'create', 'how to', 'step', 'prompt', 'download', 'free', 'paste this', 'open', 'guide', 'tutorial', 'learn', 'master', 'improve'];
    if (actionWords.some(w => text.includes(w))) score += 3;

    // Named tool mention boost (user can immediately go try it)
    const tools = ['chatgpt', 'claude', 'cursor', 'midjourney', 'gemini', 'perplexity', 'lovable', 'v0', 'copilot', 'notion', 'canva', 'runway', 'elevenlabs', 'suno', 'replit', 'deepseek', 'llama', 'mistral'];
    if (tools.some(t => text.includes(t))) score += 2;

    // Source credibility boost — official AI company blogs are inherently valuable
    if (item.source === 'rss') score += 2;
    else if (item.score && item.score > 100) score += 1;

    return Math.min(10, Math.max(0, score));
}

const JUNK_PATTERNS = [
    // Stock/finance/corporate
    'stock price', 'share price', 'market cap', 'ipo', 'valuation', 'investors', 'funding round', 'revenue', 'quarterly earnings', 'ceo says', 'executive', 'tax bills',
    // Opinion/drama pieces
    'is ai a threat', 'ai is overrated', 'narcissist', 'should we be worried', 'existential risk', 'ai doom', 'ai ethics debate', 'hit piece', 'skeptic', 'dumbest thing',
    // Celebrity/political/Art fluff
    'celebrity', 'bollywood', 'political', 'election', 'president', 'congress', 'senate', 'glass', 'hammer', 'portrait', 'hitting it',
    // Lawsuits/corporate drama with no product impact
    'lawsuit', 'sued', 'suing', 'settlement', 'legal battle', 'antitrust', 'ftc', 'outage', 'down for',
    // Vague think-pieces
    'what ai means for', 'ai will change', 'how ai is transforming',
    // Sports/non-tech/hardware fluff
    'cricket', 'football', 'basketball', 'tennis', 'olympics', 'air con', 'switch', 'airplane',
    // Misleading "AI" mentions
    'aircraft', 'airport', 'airline', 'airbus', 'airbag', 'aide', 'humanitarian aid', 'first aid',
];

function isJunkContent(item: RawContentItem): boolean {
    const text = (item.title + ' ' + (item.summary || '')).toLowerCase();
    return JUNK_PATTERNS.some(p => text.includes(p));
}

// ---- FOMO score (rules-based, action-oriented) ----
function computeFomoScore(item: RawContentItem, classification: { type: string }): number {
    let score = 5;

    // Source credibility bonus
    const domain = getDomain(item.url);
    if (['openai.com', 'anthropic.com', 'blog.google', 'deepmind.google'].includes(domain)) score += 3;

    // Type bonus (actionable types score higher)
    if (classification.type === 'trick') score += 3;
    else if (classification.type === 'new-tool') score += 2;
    else if (classification.type === 'workflow') score += 2;
    else if (classification.type === 'capability') score += 2;
    else if (classification.type === 'tool-update') score += 1;

    // Recency bonus
    const hoursAgo = (Date.now() - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60);
    if (hoursAgo < 6) score += 2;
    else if (hoursAgo < 12) score += 1;

    // Reddit/HN upvote signal
    if (item.score && item.score > 200) score += 2;
    else if (item.score && item.score > 50) score += 1;

    // Named tool boost
    const title = item.title.toLowerCase();
    const bigNames = ['openai', 'google', 'anthropic', 'chatgpt', 'claude', 'gemini', 'gpt', 'cursor', 'midjourney', 'perplexity'];
    if (bigNames.some(n => title.includes(n))) score += 1;

    return Math.min(10, Math.max(1, score));
}

// ---- Convert raw items to VerifiedUpdates (with per-item cache check) ----
function rawToVerified(items: RawContentItem[]): { updates: VerifiedUpdate[]; newlyClassified: { contentHash: string; update: VerifiedUpdate }[] } {
    const updates: VerifiedUpdate[] = [];
    const newlyClassified: { contentHash: string; update: VerifiedUpdate }[] = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Check per-item classified cache first
        const cached = getClassifiedItem(item.contentHash);
        if (cached) {
            // Update timeAgo since it's relative
            cached.timeAgo = timeAgo(cached.publishedAt);
            updates.push(cached);
            continue;
        }

        // Classify fresh
        const classification = classifyType(item.title, item.summary);
        const fomoScore = computeFomoScore(item, classification);
        const actionability = computeActionability(item, classification.type);

        // Skip very low-actionability content — threshold of 4 allows capability/update news through
        if (actionability < 4) continue;

        const update: VerifiedUpdate = {
            id: item.id || `update-${Date.now()}-${i}`,
            title: item.title,
            shortSummary: item.summary,
            type: classification.type as VerifiedUpdate['type'],
            tag: classification.tag,
            source: item.author || getDomain(item.url) || item.source,
            sourceDomain: getDomain(item.url),
            timeAgo: timeAgo(item.publishedAt),
            fomoScore,
            url: item.url,
            emoji: classification.emoji,
            publishedAt: item.publishedAt,
            actionability,
        };

        updates.push(update);
        newlyClassified.push({ contentHash: item.contentHash, update });
    }

    return { updates, newlyClassified };
}

// ---- Personalised relevance scoring ----
const CATEGORY_TAG_MAP: Record<string, string[]> = {
    'AI Writing': ['writing', 'content', 'copywriting', 'chatgpt', 'claude', 'jasper', 'grammarly'],
    'AI Images': ['images', 'image', 'art', 'midjourney', 'dall-e', 'stable diffusion', 'design', 'visual', 'leonardo', 'canva'],
    'Coding Copilots': ['coding', 'code', 'developer', 'github', 'cursor', 'copilot', 'programming', 'replit', 'v0'],
    'AI Research': ['research', 'paper', 'arxiv', 'benchmark', 'perplexity', 'study', 'model', 'deepseek'],
    'Video & Audio': ['video', 'audio', 'music', 'voice', 'runway', 'elevenlabs', 'suno', 'kling'],
    'Career & Biz': ['career', 'business', 'productivity', 'automation', 'workflow', 'enterprise'],
};

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
    'Technology': ['tech', 'software', 'developer', 'engineering', 'api', 'deployment', 'infrastructure'],
    'Marketing': ['marketing', 'content', 'brand', 'campaign', 'seo', 'social media', 'copywriting'],
    'Education': ['education', 'learning', 'student', 'teaching', 'course', 'academic'],
    'Finance': ['finance', 'trading', 'fintech', 'banking', 'investment'],
    'Healthcare': ['health', 'medical', 'clinical', 'biotech', 'drug discovery'],
    'Design': ['design', 'creative', 'ux', 'ui', 'visual', 'illustration'],
    'Media': ['media', 'journalism', 'publishing', 'news', 'content creation'],
    'Legal': ['legal', 'law', 'compliance', 'contract', 'regulation'],
    'Consulting': ['consulting', 'strategy', 'advisory', 'enterprise'],
};

export function scoreForUser(update: VerifiedUpdate, user: UserProfile): number {
    let score = 10; // base relevance
    const text = (update.title + ' ' + update.shortSummary).toLowerCase();

    // +30 for matching user's preferred categories via tag keywords
    const preferredCats = user.preferredCategories || [];
    for (const cat of preferredCats) {
        const keywords = CATEGORY_TAG_MAP[cat] || [];
        if (keywords.some(k => text.includes(k))) {
            score += 30;
            break; // only count once
        }
    }

    // +20 for matching user's industry
    const industryKws = INDUSTRY_KEYWORDS[user.industry] || [];
    if (industryKws.some(k => text.includes(k))) {
        score += 20;
    }

    // +15 for mentioning tools the user knows/uses
    const knownTools = user.toolsKnown || [];
    for (const toolName of knownTools) {
        if (text.includes(toolName.toLowerCase())) {
            score += 15;
            break;
        }
    }

    // +15 type × level appropriateness
    const isAdvanced = user.aiLevel === 'Advanced' || user.aiLevel === 'Regular User';
    if (update.type === 'trick') score += isAdvanced ? 15 : 10;      // tricks are gold for power users
    if (update.type === 'workflow') score += isAdvanced ? 12 : 8;    // workflows benefit everyone
    if (update.type === 'new-tool') score += isAdvanced ? 5 : 15;    // beginners love new tool discovery
    if (update.type === 'capability') score += isAdvanced ? 10 : 5;  // capabilities matter more to advanced
    if (update.type === 'tool-update') score += 8;                   // updates are useful for everyone

    // +10 recency bonus
    const hoursAgo = (Date.now() - new Date(update.publishedAt).getTime()) / (1000 * 60 * 60);
    if (hoursAgo < 6) score += 10;
    else if (hoursAgo < 12) score += 5;

    // FOMO boost
    score += update.fomoScore;

    return Math.min(100, Math.max(0, score));
}

// ============================================
// PIPELINE CLASS
// ============================================
class ContentPipeline {
    private isFetching = false;
    private lastFetchPromise: Promise<VerifiedUpdate[]> | null = null;
    private _initialized = false;

    /**
     * Initialize the pipeline — run eviction on first load.
     */
    private init(): void {
        if (this._initialized) return;
        this._initialized = true;
        // Clean up expired classified items only — let TTL handle pipeline cache
        evictStaleCaches();
    }

    /**
     * Get updates — checks cache first, then fetches + classifies + caches.
     */
    async getUpdates(): Promise<VerifiedUpdate[]> {
        this.init();

        // Return cached if fresh
        const cached = storageService.getCache<VerifiedUpdate[]>('delta_pipeline_updates_v2', CACHE_TTL.NEWS);
        if (cached && cached.length > 0) {
            console.log('[Pipeline] Returning cached updates:', cached.length);
            // Record cache hit in stats
            const stats = getPipelineStats();
            stats.cacheHit = true;
            savePipelineStats(stats);
            return cached;
        }

        // Prevent concurrent fetches
        if (this.isFetching && this.lastFetchPromise) {
            return this.lastFetchPromise;
        }

        this.isFetching = true;
        this.lastFetchPromise = this.fetchAllSources();

        try {
            const result = await this.lastFetchPromise;
            return result;
        } finally {
            this.isFetching = false;
            this.lastFetchPromise = null;
        }
    }

    /**
     * Get pipeline health stats.
     */
    getStats(): PipelineStats {
        return getPipelineStats();
    }

    private async fetchAllSources(): Promise<VerifiedUpdate[]> {
        const fetchStart = Date.now();
        console.log('[Pipeline] Fetching from all sources...');

        // Fetch all 7 sources in parallel with individual error isolation
        const [newsApi, reddit, hackerNews, guardian, newsData, youtube, rssFeeds] = await Promise.allSettled([
            fetchNewsApiArticles(),
            fetchRedditPosts(),
            fetchHackerNewsPosts(),
            fetchGuardianArticles(),
            fetchNewsDataArticles(),
            fetchYouTubeVideos(),
            fetchRssFeeds(),
        ]);

        // Merge results with source stats
        const allRaw: RawContentItem[] = [];
        const sourceCounts: Record<string, number> = {};

        const addResults = (result: PromiseSettledResult<RawContentItem[]>, name: string) => {
            if (result.status === 'fulfilled' && result.value.length > 0) {
                allRaw.push(...result.value);
                sourceCounts[name] = result.value.length;
            } else {
                sourceCounts[name] = 0;
                if (result.status === 'rejected') {
                    console.warn(`[Pipeline] ${name} failed:`, result.reason);
                }
            }
        };

        addResults(newsApi, 'NewsAPI');
        addResults(reddit, 'Reddit');
        addResults(hackerNews, 'HackerNews');
        addResults(guardian, 'Guardian');
        addResults(newsData, 'NewsData');
        addResults(youtube, 'YouTube');
        addResults(rssFeeds, 'CompanyBlogs');

        // Source health summary
        const sourceHealth: Record<string, 'alive' | 'dead'> = {};
        const healthParts: string[] = [];
        for (const [name, count] of Object.entries(sourceCounts)) {
            sourceHealth[name] = count > 0 ? 'alive' : 'dead';
            healthParts.push(`${name}: ${count > 0 ? `${count} items` : 'DEAD'}`);
        }
        console.log(`[Pipeline] Health: ${healthParts.join(' | ')}`);

        const keyDependentSources = ['NewsAPI', 'Guardian', 'NewsData', 'YouTube'];
        const allKeySourcesDead = keyDependentSources.every(s => sourceCounts[s] === 0);
        if (allKeySourcesDead) {
            console.warn('[Pipeline] All API-key sources returned 0 items. Consider adding API keys to .env for richer content.');
        }

        console.log('[Pipeline] Source stats:', sourceCounts, '| Total raw:', allRaw.length);

        if (allRaw.length === 0) {
            console.warn('[Pipeline] All sources returned 0 items — returning fallback');
            const stats: PipelineStats = {
                lastFetchAt: new Date().toISOString(),
                sourceCounts,
                sourceHealth,
                totalRaw: 0,
                totalAfterDedup: 0,
                totalAfterFilter: 0,
                fetchDurationMs: Date.now() - fetchStart,
                cacheHit: false,
            };
            savePipelineStats(stats);
            const fallbacks = this.getFallbackUpdates();
            // Use a shorter 15-minute TTL so fallback-only results rotate faster
            storageService.setCache('delta_pipeline_updates_v2', fallbacks, 15 * 60 * 1000);
            return fallbacks;
        }

        // Deduplicate across sources
        const deduped = deduplicateItems(allRaw);
        console.log('[Pipeline] After dedup:', deduped.length);

        // Post-dedup: AI relevance filter — broad keywords covering models, labs, tools, and techniques
        const AI_TERMS = [
            // General AI terms
            'artificial intelligence', ' ai ', ' ai,', ' ai.', 'machine learning', 'deep learning',
            'neural network', 'large language model', 'llm', 'generative ai', 'gen ai', 'transformer',
            // Techniques & workflows
            'chatbot', 'ai tool', 'new tool', 'automation', 'workflow', 'extension', 'plugin',
            'prompting', 'prompt engineering', 'fine-tun', 'ai agent', 'rag', 'vector', 'ai-powered',
            'ai model', 'language model', 'ai workflow', 'retrieval augmented', 'embedding',
            'multimodal', 'diffusion', 'agent', 'copilot',
            // Major labs
            'openai', 'anthropic', 'deepmind', 'google ai', 'meta ai', 'mistral', 'hugging face',
            'langchain', 'llamaindex',
            // Models & products
            'chatgpt', 'claude', 'gemini', 'gpt-', 'gpt', 'llama', 'deepseek', 'grok',
            // Tools
            'midjourney', 'stable diffusion', 'dall-e', 'perplexity', 'cursor', 'elevenlabs',
            'suno', 'runway', 'replit', 'lovable', 'kling', 'luma', 'v0', 'notion ai', 'canva ai',
            'github copilot',
            // Content categories
            'text-to-image', 'text-to-video', 'text-to-speech', 'voice clone',
            'code generation', 'ai coding', 'ai writing', 'ai image', 'ai video', 'ai music',
            'model release', 'open source model',
        ];
        const relevantItems = deduped.filter((item: RawContentItem) => {
            // Phase 1: Kill junk content (opinions, drama, sports, art fluff)
            if (isJunkContent(item)) return false;
            // Phase 2: RSS feeds come from official AI company blogs — always relevant
            if (item.source === 'rss') return true;
            // Phase 3: For Reddit/HN/news — require at least one AI relevance keyword
            const text = (item.title + ' ' + (item.summary || '')).toLowerCase();
            return AI_TERMS.some(k => text.includes(k));
        });
        console.log('[Pipeline] After relevance + junk filter:', relevantItems.length);

        // 3-tier fallback: strict AI_TERMS → soft (junk-only removal) → all deduped
        let itemsToClassify: RawContentItem[];
        if (relevantItems.length >= 5) {
            itemsToClassify = relevantItems;
        } else {
            const softFiltered = deduped.filter(item => !isJunkContent(item));
            if (softFiltered.length > 0) {
                console.log(`[Pipeline] Strict filter too aggressive (${relevantItems.length}), using soft filter (${softFiltered.length})`);
                itemsToClassify = softFiltered;
            } else {
                itemsToClassify = deduped;
            }
        }

        // Convert to VerifiedUpdates with per-item cache check
        const { updates, newlyClassified } = rawToVerified(itemsToClassify);

        // ---- DELTA-FICATION ----
        // Rewrite top updates in Delta Voice if they are newly classified
        let deltafiedUpdates = updates;
        if (newlyClassified.length > 0) {
            try {
                deltafiedUpdates = await deltaService.deltafySummaries(updates);
            } catch (e) {
                console.warn('[Pipeline] Delta-fication failed, using originals:', e);
            }
        }

        // Batch-save newly classified items to per-item cache
        if (newlyClassified.length > 0) {
            console.log(`[Pipeline] Newly classified: ${newlyClassified.length} items (${updates.length - newlyClassified.length} from cache)`);
            batchSetClassifiedItems(newlyClassified);
        }

        // Async Supabase upsert (fire-and-forget)
        this.upsertToSupabase(itemsToClassify, updates);

        // Retrieve current user for personalized sorting
        const user = storageService.getUser();

        // Apply personalization score to each update
        deltafiedUpdates = deltafiedUpdates.map(u => ({
            ...u,
            userScore: scoreForUser(u, user)
        }));

        // Sort by userScore (highest first), then by FOMO score, then by recency
        deltafiedUpdates.sort((a, b) => {
            const scoreA = a.userScore ?? 0;
            const scoreB = b.userScore ?? 0;
            if (scoreB !== scoreA) return scoreB - scoreA;
            if (b.fomoScore !== a.fomoScore) return b.fomoScore - a.fomoScore;
            return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        });

        // If we ended up with fewer than 5 highly actionable items (due to strict filters),
        // let's supplement the feed with our high-quality TAAFT mock tools and workflows
        // so the user never sees a blank or mostly empty screen.
        let finalUpdates = deltafiedUpdates.slice(0, 30);
        if (finalUpdates.length < 5) {
            console.warn(`[Pipeline] Only ${finalUpdates.length} items passed strict filter. Injecting fallbacks to fill UI.`);
            const fallbacks = this.getFallbackUpdates();
            // deduplicate IDs just in case
            const existingIds = new Set(finalUpdates.map(u => u.id));
            for (const fb of fallbacks) {
                if (!existingIds.has(fb.id)) {
                    finalUpdates.push(fb);
                }
            }
        }

        // Cache the results (full 1-hour TTL for real content)
        storageService.setCache('delta_pipeline_updates_v2', finalUpdates);

        // Save pipeline stats
        const stats: PipelineStats = {
            lastFetchAt: new Date().toISOString(),
            sourceCounts,
            sourceHealth,
            totalRaw: allRaw.length,
            totalAfterDedup: deduped.length,
            totalAfterFilter: finalUpdates.length,
            fetchDurationMs: Date.now() - fetchStart,
            cacheHit: false,
        };
        savePipelineStats(stats);
        console.log('[Pipeline] Complete:', stats);

        return finalUpdates;
    }

    /**
     * Async fire-and-forget Supabase upsert.
     */
    private upsertToSupabase(rawItems: RawContentItem[], updates: VerifiedUpdate[]): void {
        try {
            const updateMap = new Map(updates.map(u => [u.id, u]));
            const rows: CachedContentRow[] = rawItems.slice(0, 30).map(item => {
                const classified = updateMap.get(item.id);
                return {
                    content_hash: item.contentHash,
                    source: item.source,
                    title: item.title,
                    summary: item.summary,
                    url: item.url,
                    raw_data: item.rawData || null,
                    classified_data: classified ? (classified as any) : null,
                    relevance_scores: null, // computed on demand per-user
                    fetched_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + CACHE_TTL.NEWS).toISOString(),
                };
            });
            batchUpsertContentCache(rows);
        } catch (e) {
            console.warn('[Pipeline] Supabase upsert skipped:', e);
        }
    }

    async forceRefresh(): Promise<VerifiedUpdate[]> {
        storageService.removeCache('delta_pipeline_updates_v2');
        this.isFetching = false;
        this.lastFetchPromise = null;
        return this.getUpdates();
    }

    // Rotating pool of curated AI tips — changes every hour (matches cache TTL)
    private getFallbackUpdates(): VerifiedUpdate[] {
        const pool: VerifiedUpdate[] = [
            {
                id: 'fb-1', title: 'Use ChatGPT Canvas to edit code blocks inline',
                shortSummary: 'Highlight specific blocks of code in the Canvas view and ask ChatGPT to refactor it. It edits inline without regenerating the whole file — great for targeted changes.',
                type: 'trick', tag: 'AI TRICK', source: 'r/ChatGPTPro', sourceDomain: 'reddit.com',
                timeAgo: '3h ago', fomoScore: 6, url: 'https://reddit.com', emoji: '💡',
                publishedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), actionability: 7,
            },
            {
                id: 'fb-2', title: 'Automate research with Perplexity Spaces',
                shortSummary: 'Create a Perplexity Space, upload your guidelines, and ask it to synthesize multiple sources into structured outlines. Works for blog posts, reports, and scripts.',
                type: 'workflow', tag: 'WORKFLOW', source: 'r/ClaudeAI', sourceDomain: 'reddit.com',
                timeAgo: '4h ago', fomoScore: 5, url: 'https://perplexity.ai', emoji: '🔄',
                publishedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), actionability: 7,
            },
            {
                id: 'fb-3', title: 'Claude Projects: persistent context across conversations',
                shortSummary: 'Upload docs to a Claude Project and every new conversation in that project automatically has full context. No more re-explaining your codebase every chat.',
                type: 'trick', tag: 'AI TRICK', source: 'Anthropic', sourceDomain: 'anthropic.com',
                timeAgo: '5h ago', fomoScore: 6, url: 'https://claude.ai', emoji: '💡',
                publishedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), actionability: 7,
            },
            {
                id: 'fb-4', title: 'Cursor .cursorrules file — teach AI your code style',
                shortSummary: 'Add a .cursorrules file to your project root with your tech stack, patterns, and conventions. Cursor reads it before every interaction and writes code in YOUR style.',
                type: 'trick', tag: 'AI TRICK', source: 'Cursor', sourceDomain: 'cursor.com',
                timeAgo: '6h ago', fomoScore: 5, url: 'https://cursor.com', emoji: '⚡',
                publishedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(), actionability: 7,
            },
            {
                id: 'fb-5', title: 'DeepSeek R1: open-source reasoning that rivals GPT-4',
                shortSummary: 'DeepSeek R1 matches GPT-4 on reasoning benchmarks while being fully open-source. Run it locally with Ollama or use the free hosted version.',
                type: 'capability', tag: 'AI CAPABILITY', source: 'DeepSeek', sourceDomain: 'deepseek.com',
                timeAgo: '7h ago', fomoScore: 6, url: 'https://chat.deepseek.com', emoji: '🧠',
                publishedAt: new Date(Date.now() - 7 * 3600 * 1000).toISOString(), actionability: 6,
            },
            {
                id: 'fb-6', title: 'Gemini\'s 1M+ context window for full-codebase analysis',
                shortSummary: 'Paste your entire codebase into Gemini and ask for cross-file architectural reviews. It catches inconsistencies that file-by-file tools miss.',
                type: 'trick', tag: 'AI TRICK', source: 'Google AI', sourceDomain: 'gemini.google.com',
                timeAgo: '8h ago', fomoScore: 5, url: 'https://gemini.google.com', emoji: '💡',
                publishedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(), actionability: 6,
            },
            {
                id: 'fb-7', title: 'v0 by Vercel: generate production React components from text',
                shortSummary: 'Describe a UI component in plain English and v0 generates clean, production-ready React + Tailwind code. Great for rapid prototyping.',
                type: 'new-tool', tag: 'NEW TOOL', source: 'Vercel', sourceDomain: 'v0.dev',
                timeAgo: '9h ago', fomoScore: 6, url: 'https://v0.dev', emoji: '🆕',
                publishedAt: new Date(Date.now() - 9 * 3600 * 1000).toISOString(), actionability: 6,
            },
            {
                id: 'fb-8', title: 'ElevenLabs voice cloning in under 30 seconds',
                shortSummary: 'Record 30 seconds of your voice and ElevenLabs creates a near-perfect clone. Use it for video narration, podcasts, or audiobooks in your own voice.',
                type: 'new-tool', tag: 'NEW TOOL', source: 'ElevenLabs', sourceDomain: 'elevenlabs.io',
                timeAgo: '10h ago', fomoScore: 5, url: 'https://elevenlabs.io', emoji: '🆕',
                publishedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(), actionability: 6,
            },
            {
                id: 'fb-9', title: 'Chain-of-thought prompting: force better reasoning',
                shortSummary: 'Add "Think step by step" or "Show your reasoning" to any prompt. This simple technique dramatically improves accuracy on math, logic, and analysis tasks.',
                type: 'trick', tag: 'AI TRICK', source: 'r/AIPromptProgramming', sourceDomain: 'reddit.com',
                timeAgo: '11h ago', fomoScore: 6, url: 'https://reddit.com', emoji: '💡',
                publishedAt: new Date(Date.now() - 11 * 3600 * 1000).toISOString(), actionability: 7,
            },
            {
                id: 'fb-10', title: 'Lovable: build full-stack apps from natural language',
                shortSummary: 'Describe your app idea in plain English and Lovable generates the frontend, backend, database schemas, and authentication. Deploy in minutes.',
                type: 'new-tool', tag: 'NEW TOOL', source: 'Lovable', sourceDomain: 'lovable.dev',
                timeAgo: '12h ago', fomoScore: 5, url: 'https://lovable.dev', emoji: '💜',
                publishedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(), actionability: 6,
            },
            {
                id: 'fb-11', title: 'Midjourney style references: consistent brand imagery',
                shortSummary: 'Use --sref with an image URL to copy its visual style across all your generations. Combine with --cref to keep characters consistent too.',
                type: 'trick', tag: 'AI TRICK', source: 'Midjourney', sourceDomain: 'midjourney.com',
                timeAgo: '14h ago', fomoScore: 6, url: 'https://midjourney.com', emoji: '🎨',
                publishedAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(), actionability: 6,
            },
            {
                id: 'fb-12', title: 'GitHub Copilot Workspace: plan and implement in one flow',
                shortSummary: 'Open an issue, let Copilot Workspace analyze it, propose a plan, generate the code across files, and create the PR. Full issue-to-PR automation.',
                type: 'tool-update', tag: 'TOOL UPDATE', source: 'GitHub', sourceDomain: 'github.com',
                timeAgo: '16h ago', fomoScore: 5, url: 'https://github.com/features/copilot', emoji: '🔧',
                publishedAt: new Date(Date.now() - 16 * 3600 * 1000).toISOString(), actionability: 6,
            },
            {
                id: 'fb-13', title: 'Suno AI: generate full songs from text descriptions',
                shortSummary: 'Type a mood, genre, and topic — Suno generates a complete song with vocals, instruments, and mixing. Great for content soundtracks and jingles.',
                type: 'new-tool', tag: 'NEW TOOL', source: 'Suno', sourceDomain: 'suno.com',
                timeAgo: '18h ago', fomoScore: 6, url: 'https://suno.com', emoji: '🎵',
                publishedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(), actionability: 6,
            },
            {
                id: 'fb-14', title: 'Role + Constraint prompting for better AI output',
                shortSummary: 'Always start prompts with a role ("You are a senior product manager") then add constraints ("Keep it under 100 words, use bullet points, no jargon"). Quality jumps dramatically.',
                type: 'trick', tag: 'AI TRICK', source: 'r/ClaudeAI', sourceDomain: 'reddit.com',
                timeAgo: '20h ago', fomoScore: 5, url: 'https://reddit.com', emoji: '💡',
                publishedAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(), actionability: 7,
            },
            {
                id: 'fb-15', title: 'ChatGPT Custom Instructions: set once, improve every chat',
                shortSummary: 'Go to Settings → Personalization → Custom Instructions. Enter your role, industry, and preferred output format. Every conversation automatically adapts to your needs.',
                type: 'workflow', tag: 'WORKFLOW', source: 'OpenAI', sourceDomain: 'openai.com',
                timeAgo: '22h ago', fomoScore: 6, url: 'https://openai.com', emoji: '🔄',
                publishedAt: new Date(Date.now() - 22 * 3600 * 1000).toISOString(), actionability: 7,
            },
            {
                id: 'fb-16', title: 'Replit Agent: describe an app, get working code deployed',
                shortSummary: 'Replit\'s Agent mode takes a natural language description, writes the code, installs dependencies, fixes errors, and deploys — all automatically.',
                type: 'capability', tag: 'AI CAPABILITY', source: 'Replit', sourceDomain: 'replit.com',
                timeAgo: '1d ago', fomoScore: 5, url: 'https://replit.com', emoji: '🧠',
                publishedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), actionability: 6,
            },
            {
                id: 'fb-17', title: 'Perplexity Focus modes: Academic, Writing, Math, Video',
                shortSummary: 'Switch Perplexity\'s Focus mode to "Academic" for peer-reviewed papers only, "Math" for step-by-step solutions, or "Video" for YouTube-sourced answers.',
                type: 'trick', tag: 'AI TRICK', source: 'Perplexity', sourceDomain: 'perplexity.ai',
                timeAgo: '1d ago', fomoScore: 6, url: 'https://perplexity.ai', emoji: '💡',
                publishedAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(), actionability: 6,
            },
            {
                id: 'fb-18', title: 'Runway Gen-3 Alpha: AI video with character consistency',
                shortSummary: 'Runway\'s latest model generates video clips with consistent characters across scenes. Describe a character once and reuse them throughout your project.',
                type: 'tool-update', tag: 'TOOL UPDATE', source: 'Runway', sourceDomain: 'runwayml.com',
                timeAgo: '1d ago', fomoScore: 5, url: 'https://runwayml.com', emoji: '🔧',
                publishedAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString(), actionability: 6,
            },
            {
                id: 'fb-19', title: 'System prompts: the most powerful AI technique most people skip',
                shortSummary: 'A system prompt tells the AI HOW to behave before your question. "You are a senior technical writer who uses short sentences and avoids jargon" transforms every response.',
                type: 'workflow', tag: 'WORKFLOW', source: 'r/AIPromptProgramming', sourceDomain: 'reddit.com',
                timeAgo: '1d ago', fomoScore: 6, url: 'https://reddit.com', emoji: '🔄',
                publishedAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString(), actionability: 7,
            },
            {
                id: 'fb-20', title: 'Notion AI: turn messy notes into structured action plans',
                shortSummary: 'Select any block of text in Notion and use AI to summarize, extract action items, or rewrite in a different tone. Works natively within your workspace.',
                type: 'trick', tag: 'AI TRICK', source: 'Notion', sourceDomain: 'notion.so',
                timeAgo: '1d ago', fomoScore: 5, url: 'https://notion.so', emoji: '💡',
                publishedAt: new Date(Date.now() - 32 * 3600 * 1000).toISOString(), actionability: 6,
            },
            {
                id: 'fb-21', title: 'Lovable 2.0 — Ship Full-Stack Apps in Minutes',
                shortSummary: 'Lovable\'s major update adds backend generation, Postgres database schemas, and Supabase auth — all generated from natural language descriptions.',
                type: 'new-tool', tag: 'NEW TOOL', source: 'Lovable', sourceDomain: 'lovable.dev',
                timeAgo: '8h ago', fomoScore: 8, url: 'https://lovable.dev', emoji: '💜',
                publishedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(), actionability: 9,
            },
            {
                id: 'fb-22', title: 'The 5-step AI content workflow replacing a whole team',
                shortSummary: '1. Perplexity for research → 2. Claude for long-form draft → 3. ChatGPT for headline variants → 4. Midjourney for visuals → 5. Runway to animate the best image. Each step takes under 3 minutes.',
                type: 'workflow', tag: 'WORKFLOW', source: 'r/SideProject', sourceDomain: 'reddit.com',
                timeAgo: '3h ago', fomoScore: 9, url: 'https://reddit.com', emoji: '🔄',
                publishedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), actionability: 10,
            },
            {
                id: 'fb-23', title: 'Google Gemini 2.0 Flash is now free via API',
                shortSummary: 'Gemini 2.0 Flash is faster and cheaper than GPT-4o for most tasks, and now has a free API tier. One million tokens per minute. If you\'re not testing it today, you\'re leaving free inference on the table.',
                type: 'tool-update', tag: 'TOOL UPDATE', source: 'Google AI', sourceDomain: 'blog.google',
                timeAgo: '6h ago', fomoScore: 9, url: 'https://blog.google', emoji: '🔧',
                publishedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(), actionability: 8,
            },
            {
                id: 'fb-24', title: 'ElevenLabs can now clone your voice in 10 seconds',
                shortSummary: 'Record a 10-second audio clip of yourself reading any sentence. ElevenLabs Instant Voice Clone creates a model of your voice that can then read anything — from emails to podcast scripts.',
                type: 'new-tool', tag: 'NEW TOOL', source: 'ElevenLabs', sourceDomain: 'elevenlabs.io',
                timeAgo: '10h ago', fomoScore: 8, url: 'https://elevenlabs.io', emoji: '🎙️',
                publishedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(), actionability: 9,
            },
            {
                id: 'fb-25', title: 'The "Rubber Duck" trick: explain your problem to Claude before asking',
                shortSummary: 'Instead of asking "Fix this bug", first write: "I\'m trying to do X. My code does Y. I think the problem is Z." Claude\'s answers improve dramatically when you give it your own hypothesis to react to.',
                type: 'trick', tag: 'AI TRICK', source: 'r/LocalLLaMA', sourceDomain: 'reddit.com',
                timeAgo: '4h ago', fomoScore: 8, url: 'https://reddit.com', emoji: '💡',
                publishedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), actionability: 10,
            },
            {
                id: 'fb-26', title: 'Anthropic releases Claude 3.7 Sonnet with extended thinking',
                shortSummary: 'Claude 3.7 Sonnet introduces a "thinking" mode that shows its internal reasoning before giving a final answer — dramatically improving performance on coding, maths, and complex analysis tasks.',
                type: 'capability', tag: 'AI CAPABILITY', source: 'Anthropic', sourceDomain: 'anthropic.com',
                timeAgo: '1d ago', fomoScore: 10, url: 'https://anthropic.com', emoji: '🧠',
                publishedAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(), actionability: 8,
            },
            {
                id: 'fb-27', title: 'Build a daily AI email digest in 20 minutes using Make + Perplexity',
                shortSummary: 'Trigger: every morning at 7am. Step 1: Perplexity API call → "Summarise top 5 AI news from the last 24 hours in bullet points". Step 2: Format with HTML template. Step 3: Send via Gmail. Zero code required.',
                type: 'workflow', tag: 'WORKFLOW', source: 'r/automation', sourceDomain: 'reddit.com',
                timeAgo: '7h ago', fomoScore: 9, url: 'https://reddit.com', emoji: '🔄',
                publishedAt: new Date(Date.now() - 7 * 3600 * 1000).toISOString(), actionability: 10,
            },
            {
                id: 'fb-28', title: 'DeepSeek R2 benchmarks leak — beats GPT-4o on coding at 1/10th the cost',
                shortSummary: 'Leaked benchmark results show DeepSeek R2 surpassing GPT-4o on HumanEval and SWE-bench while running at under $0.01 per million tokens. If confirmed, this changes the cost calculus for every AI startup.',
                type: 'capability', tag: 'AI CAPABILITY', source: 'r/LocalLLaMA', sourceDomain: 'reddit.com',
                timeAgo: '14h ago', fomoScore: 9, url: 'https://reddit.com', emoji: '🚀',
                publishedAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(), actionability: 7,
            },
            {
                id: 'fb-29', title: 'The "Brain Dump" prompt for Claude',
                shortSummary: 'Paste your messy voice notes into Claude and use this prompt: "Act as an executive assistant. Organize this brain dump into a bulleted action plan sorted by priority."',
                type: 'trick', tag: 'AI TRICK', source: 'r/AIPromptProgramming', sourceDomain: 'reddit.com',
                timeAgo: '11h ago', fomoScore: 6, url: 'https://reddit.com', emoji: '💡',
                publishedAt: new Date(Date.now() - 11 * 3600 * 1000).toISOString(), actionability: 7,
            },
            {
                id: 'fb-30', title: 'Cursor\'s multi-file Agent mode can build entire features',
                shortSummary: 'Press Cmd+I and ask Cursor to "Add Stripe subscriptions to this Next.js app". It reads your docs, installs packages, and writes code across 15 files simultaneously.',
                type: 'capability', tag: 'AI CAPABILITY', source: 'Cursor', sourceDomain: 'cursor.com',
                timeAgo: '1d ago', fomoScore: 9, url: 'https://cursor.com', emoji: '⚡',
                publishedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), actionability: 10,
            },
        ];

        // Rotate selection every hour (matches cache TTL) with proper string hash
        const rotationSeed = Math.floor(Date.now() / (3600 * 1000));
        const hashStr = (s: string) => {
            let h = 0;
            for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
            return h;
        };
        const shuffled = [...pool].sort((a, b) => {
            const hashA = Math.abs(hashStr(a.id + rotationSeed)) % pool.length;
            const hashB = Math.abs(hashStr(b.id + rotationSeed)) % pool.length;
            return hashA - hashB;
        });

        // Return 8 items with unique IDs based on rotation
        return shuffled.slice(0, 8).map(item => ({
            ...item,
            id: `${item.id}-${rotationSeed}`,
        }));
    }
}

export const contentPipeline = new ContentPipeline();
