import { RawContentItem } from '../../../shared/types/types';

const SUBREDDITS = [
    { name: 'ChatGPT', limit: 30 },
    { name: 'ClaudeAI', limit: 15 },
    { name: 'LocalLLaMA', limit: 15 },
    { name: 'AIPromptProgramming', limit: 15 },
    { name: 'artificial', limit: 15 },
    { name: 'MachineLearning', limit: 15 },
    { name: 'StableDiffusion', limit: 10 },
    { name: 'SideProject', limit: 10 },
];

const PROXY_CHAIN = [
    (url: string) => url,  // Direct fetch (works if CORS headers present)
    (url: string) => `/proxy?url=${encodeURIComponent(url)}`,  // Vite dev proxy
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

async function fetchWithFallback(url: string): Promise<any> {
    for (const makeUrl of PROXY_CHAIN) {
        try {
            const response = await fetch(makeUrl(url), {
                signal: AbortSignal.timeout(8000),
            });
            if (response.ok) return response.json();
        } catch { /* try next */ }
    }
    throw new Error(`All fetch attempts failed for ${url}`);
}

export async function fetchRedditPosts(): Promise<RawContentItem[]> {
    const urls = SUBREDDITS.map(s =>
        `https://www.reddit.com/r/${s.name}/hot.json?limit=${s.limit}`
    );

    try {
        // Use allSettled so one failing subreddit doesn't kill all
        const results = await Promise.allSettled(
            urls.map(url => fetchWithFallback(url))
        );

        const items: RawContentItem[] = [];

        results.forEach((result, i) => {
            if (result.status !== 'fulfilled') {
                console.warn(`[Reddit] r/${SUBREDDITS[i].name} failed:`, result.reason);
                return;
            }
            const data = result.value;
            const posts = data.data?.children || [];
            posts.forEach(({ data: p }: any) => {
                if (p.is_self || p.url) {
                    items.push({
                        id: `reddit-${p.id}`,
                        source: 'reddit',
                        title: p.title,
                        summary: p.selftext ? p.selftext.substring(0, 500) : p.title,
                        url: `https://reddit.com${p.permalink}`,
                        publishedAt: new Date(p.created_utc * 1000).toISOString(),
                        author: `r/${p.subreddit}`,
                        score: p.score,
                        contentHash: p.id,
                        rawData: p,
                    });
                }
            });
        });

        return items;
    } catch (e) {
        console.warn('[Reddit] Fetch failed:', e);
        return [];
    }
}
