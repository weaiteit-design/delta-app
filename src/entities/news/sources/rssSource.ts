import { RawContentItem } from '../../../shared/types/types';

const RSS_FEEDS = [
    // Company blogs
    { name: 'OpenAI', url: 'https://openai.com/blog/rss.xml' },
    { name: 'Anthropic', url: 'https://www.anthropic.com/feed.xml' },
    { name: 'Google AI', url: 'https://blog.google/technology/ai/rss/' },
    { name: 'Meta AI', url: 'https://ai.meta.com/blog/rss/' },
    { name: 'Mistral', url: 'https://mistral.ai/news/feed.xml' },
    { name: 'HuggingFace', url: 'https://huggingface.co/blog/feed.xml' },
    { name: 'ArXiv AI', url: 'http://export.arxiv.org/rss/cs.AI' },
    { name: 'GitHub Trending', url: 'https://github.com/trending/javascript.atom' },
    // Top AI newsletters
    { name: 'TLDR AI', url: 'https://tldr.tech/ai/rss' },
    { name: 'The Rundown AI', url: 'https://www.therundown.ai/feed' },
    { name: 'Bens Bites', url: 'https://bensbites.beehiiv.com/feed' },
    { name: 'Import AI', url: 'https://importai.substack.com/feed' },
    { name: 'The Batch', url: 'https://www.deeplearning.ai/the-batch/feed/' },
];

const FALLBACK_CORS_PROXY = 'https://api.allorigins.win/raw?url=';

async function fetchFeedWithFallback(url: string): Promise<Response> {
    // Try Vite dev proxy first
    const proxyUrl = `/proxy?url=${encodeURIComponent(url)}`;
    try {
        const response = await fetch(proxyUrl, {
            headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
            signal: AbortSignal.timeout(8000),
        });
        if (response.ok) return response;
    } catch { /* fall through to CORS proxy */ }

    // Fallback: public CORS proxy
    const fallbackUrl = `${FALLBACK_CORS_PROXY}${encodeURIComponent(url)}`;
    const response = await fetch(fallbackUrl, {
        signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
}

export async function fetchRssFeeds(): Promise<RawContentItem[]> {
    const promises = RSS_FEEDS.map(async (feed) => {
        try {
            const response = await fetchFeedWithFallback(feed.url);
            const text = await response.text();

            // Native browser XML parsing
            const parser = new window.DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");

            const items = Array.from(xmlDoc.querySelectorAll('item, entry')).slice(0, 8);

            return items.map((item) => {
                // Handle both RSS <item> and Atom <entry> tags safely
                const title = item.querySelector('title')?.textContent || 'AI Update';
                const link = item.querySelector('link')?.textContent || item.querySelector('link')?.getAttribute('href') || '';
                const guid = item.querySelector('guid, id')?.textContent || link;

                // Get summary or content
                const description = item.querySelector('description, summary, content')?.textContent || '';
                const encodedContent = item.getElementsByTagNameNS('*', 'encoded')[0]?.textContent || '';
                const summary = description || encodedContent || '';

                const pubDate = item.querySelector('pubDate, published, updated')?.textContent;

                return {
                    id: `rss-${guid}`,
                    source: 'rss',
                    title: title,
                    summary: summary,
                    url: link,
                    publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                    author: feed.name,
                    contentHash: `rss-${title}`,
                    rawData: {}
                } as RawContentItem;
            });
        } catch (e) {
            console.warn(`[RSS] Failed to fetch ${feed.name}:`, e);
            return [];
        }
    });

    const results = await Promise.all(promises);
    return results.flat();
}
