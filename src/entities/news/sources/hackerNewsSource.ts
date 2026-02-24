import { RawContentItem } from '../../../shared/types/types';

export async function fetchHackerNewsPosts(): Promise<RawContentItem[]> {
    try {
        const topIdsResponse = await fetch('https://hacker-news.firebaseio.com/v0/newstories.json');
        const topIds = await topIdsResponse.json();
        const aiIds = topIds.slice(0, 50);

        const items: RawContentItem[] = [];
        const detailPromises = aiIds.map((id: number) =>
            fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json())
        );

        const details = await Promise.all(detailPromises);

        details.forEach(p => {
            if (p && p.title && (p.title.toLowerCase().includes('ai') || p.title.toLowerCase().includes('llm') || p.title.toLowerCase().includes('gpt'))) {
                items.push({
                    id: `hn-${p.id}`,
                    source: 'hackernews',
                    title: p.title,
                    summary: p.text ? p.text.substring(0, 500) : p.title,
                    url: p.url || `https://news.ycombinator.com/item?id=${p.id}`,
                    publishedAt: new Date(p.time * 1000).toISOString(),
                    author: p.by,
                    score: p.score,
                    contentHash: String(p.id),
                    rawData: p
                });
            }
        });

        return items;
    } catch (e) {
        console.warn('[HackerNews] Fetch failed:', e);
        return [];
    }
}
