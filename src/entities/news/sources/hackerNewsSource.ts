import { RawContentItem } from '../../../shared/types/types';

// Broad set of AI-related keywords for title filtering
const AI_KEYWORDS = [
    'ai', 'llm', 'gpt', 'claude', 'openai', 'anthropic', 'gemini', 'chatgpt',
    'cursor', 'copilot', 'machine learning', 'deep learning', 'neural',
    'transformer', 'generative', 'diffusion', 'prompt', 'rag', 'embedding',
    'fine-tun', 'multimodal', 'agent', 'perplexity', 'midjourney', 'deepseek',
    'mistral', 'hugging face', 'langchain', 'automation', 'chatbot',
    'stable diffusion', 'dall-e', 'text-to-image', 'text-to-video',
    'voice clone', 'code generation', 'ai coding', 'llamaindex',
    'large language model', 'artificial intelligence',
];

export async function fetchHackerNewsPosts(): Promise<RawContentItem[]> {
    try {
        // Fetch from both topstories and beststories for better signal
        const [topRes, bestRes] = await Promise.allSettled([
            fetch('https://hacker-news.firebaseio.com/v0/topstories.json', {
                signal: AbortSignal.timeout(8000),
            }).then(r => r.json()),
            fetch('https://hacker-news.firebaseio.com/v0/beststories.json', {
                signal: AbortSignal.timeout(8000),
            }).then(r => r.json()),
        ]);

        // Merge and deduplicate IDs from both endpoints
        const allIds = new Set<number>();
        if (topRes.status === 'fulfilled') {
            (topRes.value as number[]).slice(0, 60).forEach(id => allIds.add(id));
        }
        if (bestRes.status === 'fulfilled') {
            (bestRes.value as number[]).slice(0, 60).forEach(id => allIds.add(id));
        }

        if (allIds.size === 0) return [];

        // Fetch story details with timeout per request, using allSettled for resilience
        const storyIds = Array.from(allIds).slice(0, 100);
        const detailResults = await Promise.allSettled(
            storyIds.map(id =>
                fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
                    signal: AbortSignal.timeout(5000),
                }).then(r => r.json())
            )
        );

        const items: RawContentItem[] = [];
        for (const result of detailResults) {
            if (result.status !== 'fulfilled' || !result.value) continue;
            const p = result.value;
            if (!p.title) continue;

            const titleLower = p.title.toLowerCase();
            const isAIRelated = AI_KEYWORDS.some(k => titleLower.includes(k));
            if (!isAIRelated) continue;

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
        }

        return items;
    } catch (e) {
        console.warn('[HackerNews] Fetch failed:', e);
        return [];
    }
}
