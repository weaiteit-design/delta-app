import { RawContentItem } from '../../../shared/types/types';

// Combined subreddits from both branches
const SUBREDDITS = [
    { name: 'ChatGPT', limit: 30, minScore: 10 },
    { name: 'ClaudeAI', limit: 20, minScore: 5 },
    { name: 'LocalLLaMA', limit: 20, minScore: 5 },
    { name: 'AIPromptProgramming', limit: 20, minScore: 5 },
    { name: 'artificial', limit: 20, minScore: 10 },
    { name: 'singularity', limit: 15, minScore: 10 },
    { name: 'OpenAI', limit: 15, minScore: 10 },
    { name: 'MachineLearning', limit: 15, minScore: 10 },
    { name: 'StableDiffusion', limit: 10, minScore: 10 },
    { name: 'midjourney', limit: 10, minScore: 20 },
    { name: 'SideProject', limit: 10, minScore: 5 },
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
            const { minScore } = SUBREDDITS[i];
            const posts = data.data?.children || [];

            posts.forEach(({ data: p }: any) => {
                // Filter out very low-score posts — these are likely noise
                if ((p.score || 0) < minScore) return;
                if (!p.title) return;

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
            });
        });

        return items;
    } catch (e) {
        console.warn('[Reddit] Fetch failed:', e);
        return [];
    }
}
