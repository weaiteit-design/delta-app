import { RawContentItem } from '../../../shared/types/types';

// Broader keyword set — catches all AI/ML content, not just 'ai'/'llm'/'gpt'
const AI_KEYWORDS_HN = [
    'ai', 'llm', 'gpt', 'claude', 'chatgpt', 'gemini', 'openai', 'anthropic',
    'deepmind', 'llama', 'mistral', 'diffusion', 'machine learning', 'neural',
    'transformer', 'cursor', 'midjourney', 'deepseek', 'language model', 'copilot',
    'stable diffusion', 'hugging face', 'inference', 'fine-tun', 'embedding',
];

export async function fetchHackerNewsPosts(): Promise<RawContentItem[]> {
    try {
        // topstories = community-upvoted quality content; much better signal than newstories
        const topIdsResponse = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
        const topIds = await topIdsResponse.json();
        // Check top 100 stories — already quality-filtered by community upvotes
        const candidateIds = topIds.slice(0, 100);

        const items: RawContentItem[] = [];
        const detailPromises = candidateIds.map((id: number) =>
            fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json())
        );

        const details = await Promise.all(detailPromises);

        details.forEach(p => {
            if (!p || !p.title) return;
            const titleLower = p.title.toLowerCase();
            const isAIRelevant = AI_KEYWORDS_HN.some(k => titleLower.includes(k));
            if (!isAIRelevant) return;

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
                rawData: p,
            });
        });

        return items;
    } catch (e) {
        console.warn('[HackerNews] Fetch failed:', e);
        return [];
    }
}
