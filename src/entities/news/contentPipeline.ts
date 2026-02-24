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
    let score = 2; // start low, but give valid items a fighting chance to pass the strict threshold.
    const text = (item.title + ' ' + item.summary).toLowerCase();

    // Type-based baseline
    if (type === 'trick') score += 5;       // tricks are highly actionable
    if (type === 'workflow') score += 4;    // workflows teach processes
    if (type === 'new-tool') score += 4;    // new tools can be tried
    if (type === 'tool-update') score += 3; // updates inform usage
    if (type === 'capability') score += 2;  // capabilities are informational

    // Actionable language boost
    const actionWords = ['try', 'use', 'build', 'create', 'how to', 'step', 'prompt', 'download', 'free', 'paste this', 'open', 'guide', 'tutorial'];
    if (actionWords.some(w => text.includes(w))) score += 3;

    // Named tool mention boost (user can immediately go try it)
    const tools = ['chatgpt', 'claude', 'cursor', 'midjourney', 'gemini', 'perplexity', 'lovable', 'v0', 'copilot', 'notion', 'canva', 'runway', 'elevenlabs', 'suno', 'replit'];
    if (tools.some(t => text.includes(t))) score += 2;

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
    'the future of', 'what ai means for', 'ai will change', 'how ai is transforming', 'path forward', 'accelerating life-saving',
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

        // Skip low-actionability content (junk/fluff). Threshold raised to 6 to force extreme quality.
        if (actionability < 6) continue;

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
        // FORCE CLEAR old caches to ensure users get the new TAAFT-style actionable data
        platformStorage.removeItem('delta_pipeline_updates');
        platformStorage.removeItem('delta_classified_items');
        evictStaleCaches();
    }

    /**
     * Get updates — checks cache first, then fetches + classifies + caches.
     */
    async getUpdates(): Promise<VerifiedUpdate[]> {
        this.init();

        // Return cached if fresh
        const cached = storageService.getCache<VerifiedUpdate[]>('delta_pipeline_updates', CACHE_TTL.NEWS);
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

        console.log('[Pipeline] Source stats:', sourceCounts, '| Total raw:', allRaw.length);

        if (allRaw.length === 0) {
            console.warn('[Pipeline] All sources returned 0 items — returning fallback');
            const stats: PipelineStats = {
                lastFetchAt: new Date().toISOString(),
                sourceCounts,
                totalRaw: 0,
                totalAfterDedup: 0,
                totalAfterFilter: 0,
                fetchDurationMs: Date.now() - fetchStart,
                cacheHit: false,
            };
            savePipelineStats(stats);
            return this.getFallbackUpdates();
        }

        // Deduplicate across sources
        const deduped = deduplicateItems(allRaw);
        console.log('[Pipeline] After dedup:', deduped.length);

        // Post-dedup: strict AI relevance filter
        const AI_CORE = ['ai tools', 'new tool', 'automation', 'workflow', 'extension', 'plugin', 'prompting', 'copilot', 'agent', 'lovable', 'v0', 'replit', 'cursor', 'perplexity', 'claude 3.5', 'gpt-4o', 'gemini 1.5', 'midjourney v6', 'elevenlabs', 'suno', 'runway', 'luma', 'kling'];
        const relevantItems = deduped.filter((item: RawContentItem) => {
            // Phase 1: Kill junk content (opinions, drama, sports, art fluff)
            if (isJunkContent(item)) return false;
            // Phase 2: Must contain at least one CORE tool/workflow keyword
            const text = (item.title + ' ' + (item.summary || '')).toLowerCase();
            return AI_CORE.some(k => text.includes(k));
        });
        console.log('[Pipeline] After relevance + junk filter:', relevantItems.length);

        // Convert to VerifiedUpdates with per-item cache check
        const { updates, newlyClassified } = rawToVerified(relevantItems.length > 0 ? relevantItems : deduped);

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
        this.upsertToSupabase(relevantItems.length > 0 ? relevantItems : deduped, updates);

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

        // Cache the results
        storageService.setCache('delta_pipeline_updates', finalUpdates);

        // Save pipeline stats
        const stats: PipelineStats = {
            lastFetchAt: new Date().toISOString(),
            sourceCounts,
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

    private getFallbackUpdates(): VerifiedUpdate[] {
        return [
            {
                id: 'fb-1', title: 'Use ChatGPT Canvas to write React components 10x faster',
                shortSummary: 'Highlight specific blocks of code in the Canvas view and ask ChatGPT to "Refactor this component to use Tailwind CSS". It edits inline without regenerating the whole file.',
                type: 'trick', tag: 'AI TRICK', source: 'r/ChatGPTPro', sourceDomain: 'reddit.com',
                timeAgo: '2h ago', fomoScore: 10, url: 'https://reddit.com', emoji: '💡',
                publishedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), actionability: 10,
            },
            {
                id: 'fb-2', title: 'How I automate my YouTube script research using Perplexity Spaces',
                shortSummary: 'Step 1: Create a Perplexity Space. Step 2: Upload your brand guidelines. Step 3: Ask it to research 5 articles and synthesize them into a 10-minute script outline.',
                type: 'workflow', tag: 'WORKFLOW', source: 'r/ClaudeAI', sourceDomain: 'reddit.com',
                timeAgo: '5h ago', fomoScore: 9, url: 'https://reddit.com', emoji: '🔄',
                publishedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), actionability: 10,
            },
            {
                id: 'fb-3', title: 'Lovable 2.0 — Ship Full Full-Stack Apps in Minutes',
                shortSummary: 'Lovable\'s major update adds backend generation, Postgres database schemas, and Supabase auth — all generated from natural language descriptions.',
                type: 'new-tool', tag: 'NEW TOOL', source: 'Lovable', sourceDomain: 'lovable.dev',
                timeAgo: '8h ago', fomoScore: 8, url: 'https://lovable.dev', emoji: '💜',
                publishedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(), actionability: 9,
            },
            {
                id: 'fb-4', title: 'The "Brain Dump" prompt for Claude 3.5 Sonnet',
                shortSummary: 'Paste your messy voice notes into Claude and use this prompt: "Act as an executive assistant. Organize this brain dump into a bulleted action plan sorted by priority."',
                type: 'trick', tag: 'AI TRICK', source: 'r/AIPromptProgramming', sourceDomain: 'reddit.com',
                timeAgo: '12h ago', fomoScore: 8, url: 'https://reddit.com', emoji: '🧠',
                publishedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(), actionability: 10,
            },
            {
                id: 'fb-5', title: 'Cursor\'s new multi-file Agent mode can build entire features',
                shortSummary: 'Press Cmd+I and ask Cursor to "Add Stripe subscriptions to this Next.js app". It will read your docs, install packages, and write code across 15 different files simultaneously.',
                type: 'capability', tag: 'AI CAPABILITY', source: 'Cursor', sourceDomain: 'cursor.com',
                timeAgo: '1d ago', fomoScore: 9, url: 'https://cursor.com', emoji: '⚡',
                publishedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), actionability: 10,
            },
        ];
    }
}

export const contentPipeline = new ContentPipeline();
