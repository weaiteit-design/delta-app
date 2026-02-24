// ============================================
// DELTA — Content Types
// ============================================

export interface RawContentItem {
    id: string;
    source: 'newsapi' | 'newsdata' | 'guardian' | 'reddit' | 'hackernews' | 'youtube' | 'rss';
    title: string;
    summary: string;
    url: string;
    publishedAt: string;
    author?: string;
    imageUrl?: string;
    score?: number; // Reddit/HN upvotes
    contentHash: string;
    rawData?: Record<string, any>; // Full source response for reprocessing
}

export interface VerifiedUpdate {
    id: string;
    title: string;
    shortSummary: string;
    type: 'tool-update' | 'new-tool' | 'trick' | 'workflow' | 'capability';
    tag: string;
    source: string;
    sourceDomain: string;
    timeAgo: string;
    fomoScore: number;
    url?: string;
    emoji?: string;
    publishedAt: string;
    actionability?: number; // 0-10 how actionable this is for the user
    userScore?: number; // Personalized score based on user profile
}

export interface ToolPricing {
    model: 'free' | 'freemium' | 'paid';
    startingPrice?: string;   // e.g. "$20/mo"
    freeDetails?: string;     // e.g. "100 messages/day"
}

export interface ToolData {
    id: string;
    name: string;
    description: string;
    category: string;
    tag: string;
    domain: string;
    url: string;
    matchScore: number;
    mastery: number;
    isNew?: boolean;
    logoUrl: string;
    deltaAnalysis?: string;
    useCases?: string[];
    bestFor?: string[];
    pricing: ToolPricing;
}

export interface LessonData {
    id: string;
    title: string;
    category: string;
    duration: string;
    xp: number;
    difficulty: number;
    preview: string;
    pill: string;
    recommended?: boolean;
    steps?: string[];
    practiceTask?: string;
    taskPrompt?: string;
    sources?: { title: string; url: string; thumbnail?: string }[];
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'ai';
    text: string;
    lessonCard?: LessonData;
}

export interface CategoryData {
    name: string;
    emoji: string;
    done: number;
    total: number;
    color: string;
}

export interface SkillData {
    name: string;
    emoji: string;
    percent: number;
    color: string;
}

export interface PipelineStats {
    lastFetchAt: string | null;
    sourceCounts: Record<string, number>;
    totalRaw: number;
    totalAfterDedup: number;
    totalAfterFilter: number;
    fetchDurationMs: number;
    cacheHit: boolean;
}
