// ============================================
// DELTA — Storage Service (localStorage + Supabase Sync)
// ============================================

import { supabase, IS_CONFIGURED } from '../../shared/api/supabaseClient';

export interface UserProfile {
    id: string;
    name: string;
    role: string;
    goals: string[];
    aiLevel: string;
    industry: string;
    preferredCategories: string[];
    toolsKnown: string[];
    learningStyle: string;
    level: number;
    levelTitle: string;
    xp: number;
    streak: number;
    lessonsCompleted: number;
    completedLessonIds: string[];
    lastVisit: string;
    onboardingComplete: boolean;
    initials: string;
    savedArticleIds: string[];
    savedToolIds: string[];
}

export const ROLES = ['Student', 'Non-Technical Pro', 'Technical Pro', 'Founder', 'Creator & Marketer'] as const;
export const INDUSTRIES = ['Technology', 'Marketing', 'Education', 'Finance', 'Healthcare', 'Design', 'Media', 'Legal', 'Consulting', 'Other'] as const;
export const GOALS = ['Productivity', 'Career Growth', 'Learning Fundamentals', 'Building Products', 'Content Creation', 'Automation'] as const;
export const AI_LEVELS = ['Beginner', 'Familiar', 'Regular User', 'Advanced'] as const;
export const LEARNING_STYLES = ['Short & Practical', 'Step-by-Step', 'Concept → Example', 'Hands-On Challenges'] as const;
export const CONTENT_CATEGORIES = ['AI Writing', 'AI Images', 'Coding Copilots', 'AI Research', 'Video & Audio', 'Career & Biz'] as const;

const KEYS = {
    USER: 'delta_user',
    STATS: 'delta_stats',
    NEWS_CACHE: 'delta_news_cache',
    TOOLS_CACHE: 'delta_tools_cache',
    LESSONS_CACHE: 'delta_lessons_cache',
} as const;

export const LEVELS = [
    { level: 1, title: 'Observer', xp: 0 },
    { level: 2, title: 'Explorer', xp: 50 },
    { level: 3, title: 'Builder', xp: 150 },
    { level: 4, title: 'Architect', xp: 300 },
    { level: 5, title: 'Visionary', xp: 600 },
    { level: 6, title: 'Oracle', xp: 1000 },
];

export function getLevelForXP(xp: number): { level: number; title: string; nextXp: number } {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (xp >= LEVELS[i].xp) {
            const next = LEVELS[i + 1];
            return {
                level: LEVELS[i].level,
                title: LEVELS[i].title,
                nextXp: next ? next.xp : LEVELS[i].xp,
            };
        }
    }
    return { level: 1, title: 'Observer', nextXp: 50 };
}

class StorageService {
    // ---- User Profile ----
    getUser(): UserProfile {
        const def = this.getDefaultUser();
        try {
            const raw = localStorage.getItem(KEYS.USER);
            if (raw) {
                const parsed = JSON.parse(raw);
                return {
                    ...def,
                    ...parsed,
                    preferredCategories: parsed.preferredCategories || def.preferredCategories,
                    toolsKnown: parsed.toolsKnown || def.toolsKnown,
                    goals: parsed.goals || def.goals,
                    completedLessonIds: parsed.completedLessonIds || def.completedLessonIds || [],
                    savedArticleIds: parsed.savedArticleIds || def.savedArticleIds || [],
                    savedToolIds: parsed.savedToolIds || def.savedToolIds || [],
                };
            }
        } catch { }
        return def;
    }

    saveUser(user: UserProfile): void {
        localStorage.setItem(KEYS.USER, JSON.stringify(user));
        this.syncToCloud(user);
    }

    private getDefaultUser(): UserProfile {
        const def: UserProfile = {
            id: 'user-' + Date.now(),
            name: '', // Empty name forces Onboarding
            role: '',
            goals: [],
            aiLevel: '',
            industry: '',
            preferredCategories: [],
            toolsKnown: [],
            learningStyle: '',
            level: 1,
            levelTitle: 'Observer',
            xp: 0,
            streak: 0,
            lessonsCompleted: 0,
            completedLessonIds: [],
            lastVisit: new Date().toISOString(),
            onboardingComplete: false,
            initials: '',
            savedArticleIds: [],
            savedToolIds: [],
        };
        // Do not auto-save. Let the Auth/Onboarding flow handle saving.
        return def;
    }

    // ---- Streak ----
    updateStreak(): UserProfile {
        const user = this.getUser();
        const now = new Date();
        const lastVisit = new Date(user.lastVisit);
        const daysDiff = Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === 1) {
            user.streak += 1;
        } else if (daysDiff > 1) {
            user.streak = 1; // reset
        }
        // daysDiff === 0 means same day, no change

        user.lastVisit = now.toISOString();
        this.saveUser(user);
        return user;
    }

    // ---- XP ----
    addXP(amount: number, lessonId?: string): { user: UserProfile, leveledUp: boolean } {
        const user = this.getUser();
        const oldLevel = user.level;

        user.xp += amount;
        if (lessonId && !user.completedLessonIds.includes(lessonId)) {
            user.lessonsCompleted += 1;
            user.completedLessonIds.push(lessonId);
        }

        const lvl = getLevelForXP(user.xp);
        user.level = lvl.level;
        user.levelTitle = lvl.title;

        this.saveUser(user);
        this.syncToCloud(user);

        return { user, leveledUp: user.level > oldLevel };
    }

    // ---- Saves/Bookmarks ----
    toggleArticleSave(articleId: string): boolean {
        const user = this.getUser();
        let isSaved = false;
        if (user.savedArticleIds.includes(articleId)) {
            user.savedArticleIds = user.savedArticleIds.filter(id => id !== articleId);
        } else {
            user.savedArticleIds.push(articleId);
            isSaved = true;
        }
        this.saveUser(user);
        return isSaved;
    }

    isArticleSaved(articleId: string): boolean {
        return this.getUser().savedArticleIds.includes(articleId);
    }

    toggleToolSave(toolId: string): boolean {
        const user = this.getUser();
        let isSaved = false;
        if (user.savedToolIds.includes(toolId)) {
            user.savedToolIds = user.savedToolIds.filter(id => id !== toolId);
        } else {
            user.savedToolIds.push(toolId);
            isSaved = true;
        }
        this.saveUser(user);
        return isSaved;
    }

    isToolSaved(toolId: string): boolean {
        return this.getUser().savedToolIds.includes(toolId);
    }

    // ---- Cloud Sync ----

    // Push local state to cloud (fire and forget)
    syncToCloud(user: UserProfile) {
        if (!IS_CONFIGURED) return;
        supabase.auth.getSession().then(({ data: { session } }: any) => {
            if (session && session.user) {
                // Overwrite cloud with local state
                const row = { ...user, id: session.user.id }; // Define 'row' here
                supabase
                    .from('user_profiles') // Changed from 'users' to 'user_profiles'
                    .upsert(row)
                    .then(({ error }: any) => { if (error) console.warn('[Supabase] Sync:', error); });
            }
        });
    }

    // Pull cloud state to local (usually on login)
    async syncFromCloud(): Promise<UserProfile | null> {
        if (!IS_CONFIGURED) return null;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return null;

        const { data, error } = await supabase
            .from('user_profiles') // Fixed inconsistency from 'users'
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error || !data) {
            // No cloud profile yet, push our local one up
            const localUser = this.getUser();
            localUser.id = session.user.id;
            this.saveUser(localUser);
            this.syncToCloud(localUser);
            return localUser;
        }

        // Merge cloud data over local
        const mergedUser = { ...this.getUser(), ...data, id: session.user.id };

        // Save to local storage
        localStorage.setItem(KEYS.USER, JSON.stringify(mergedUser));
        return mergedUser;
    }

    // ---- Cache helpers ----
    getCache<T>(key: string, maxAgeMs: number = 60 * 60 * 1000): T | null {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const { data, timestamp, ttlMs } = JSON.parse(raw);
            const effectiveTtl = ttlMs ?? maxAgeMs;
            if (Date.now() - timestamp > effectiveTtl) {
                localStorage.removeItem(key);
                return null;
            }
            return data as T;
        } catch {
            return null;
        }
    }

    setCache(key: string, data: unknown, ttlMs?: number): void {
        try {
            localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now(), ttlMs }));
        } catch (e) {
            // localStorage full — evict old caches
            this.evictOldCaches();
            try {
                localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now(), ttlMs }));
            } catch { }
        }
    }

    removeCache(key: string): void {
        localStorage.removeItem(key);
    }

    private evictOldCaches(): void {
        const keysToCheck = Object.values(KEYS);
        for (const key of keysToCheck) {
            try {
                const raw = localStorage.getItem(key);
                if (raw) {
                    const { timestamp } = JSON.parse(raw);
                    if (Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000) {
                        localStorage.removeItem(key);
                    }
                }
            } catch { }
        }
    }

    // ---- Specific caches ----
    getNewsCache() { return this.getCache<any[]>(KEYS.NEWS_CACHE, 60 * 60 * 1000); } // 1 hour
    setNewsCache(data: any[]) { this.setCache(KEYS.NEWS_CACHE, data); }

    getToolsCache() { return this.getCache<any[]>(KEYS.TOOLS_CACHE, 24 * 60 * 60 * 1000); } // 24 hours
    setToolsCache(data: any[]) { this.setCache(KEYS.TOOLS_CACHE, data); }
}

export const storageService = new StorageService();
