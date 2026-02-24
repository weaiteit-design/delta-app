import { RawContentItem } from '../../../shared/types/types';

export async function fetchRedditPosts(): Promise<RawContentItem[]> {
    const urls = [
        'https://www.reddit.com/r/ChatGPT/new.json?limit=40',
        'https://www.reddit.com/r/ClaudeAI/new.json?limit=15',
        'https://www.reddit.com/r/LocalLLaMA/new.json?limit=15',
        'https://www.reddit.com/r/AIPromptProgramming/new.json?limit=15',
        'https://www.reddit.com/r/AIcrowd/new.json?limit=15',
        'https://www.reddit.com/r/SideProject/new.json?limit=15',
    ];

    try {
        const results = await Promise.all(urls.map(url => {
            const proxyUrl = `/proxy?url=${encodeURIComponent(url)}`;
            return fetch(proxyUrl).then(r => r.json());
        }));
        const items: RawContentItem[] = [];

        results.forEach(data => {
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
                        rawData: p
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
