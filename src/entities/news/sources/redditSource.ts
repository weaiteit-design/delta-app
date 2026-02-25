import { RawContentItem } from '../../../shared/types/types';

// hot.json = trending quality posts; much better signal than new.json
// Added r/artificial, r/singularity, r/OpenAI, r/midjourney for broader AI coverage
const REDDIT_FEEDS = [
    { url: 'https://www.reddit.com/r/ChatGPT/hot.json?limit=25', minScore: 10 },
    { url: 'https://www.reddit.com/r/ClaudeAI/hot.json?limit=20', minScore: 5 },
    { url: 'https://www.reddit.com/r/LocalLLaMA/hot.json?limit=20', minScore: 5 },
    { url: 'https://www.reddit.com/r/artificial/hot.json?limit=20', minScore: 10 },
    { url: 'https://www.reddit.com/r/singularity/hot.json?limit=15', minScore: 10 },
    { url: 'https://www.reddit.com/r/AIPromptProgramming/hot.json?limit=20', minScore: 5 },
    { url: 'https://www.reddit.com/r/OpenAI/hot.json?limit=15', minScore: 10 },
    { url: 'https://www.reddit.com/r/midjourney/hot.json?limit=10', minScore: 20 },
];

export async function fetchRedditPosts(): Promise<RawContentItem[]> {
    try {
        const results = await Promise.allSettled(
            REDDIT_FEEDS.map(({ url }) => {
                const proxyUrl = `/proxy?url=${encodeURIComponent(url)}`;
                return fetch(proxyUrl).then(r => r.json());
            })
        );

        const items: RawContentItem[] = [];

        results.forEach((result, i) => {
            if (result.status !== 'fulfilled') return;
            const data = result.value;
            const { minScore } = REDDIT_FEEDS[i];
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
