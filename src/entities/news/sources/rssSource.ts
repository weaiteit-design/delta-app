import { RawContentItem } from '../../../shared/types/types';

const RSS_FEEDS = [
    { name: 'OpenAI', url: 'https://openai.com/blog/rss.xml' },
    { name: 'Anthropic', url: 'https://www.anthropic.com/feed.xml' },
    { name: 'Google AI', url: 'https://blog.google/technology/ai/rss/' },
    { name: 'Meta AI', url: 'https://ai.meta.com/blog/rss/' },
    { name: 'Mistral', url: 'https://mistral.ai/news/feed.xml' },
    { name: 'HuggingFace', url: 'https://huggingface.co/blog/feed.xml' },
    { name: 'ArXiv AI', url: 'http://export.arxiv.org/rss/cs.AI' },
    { name: 'GitHub Trending', url: 'https://github.com/trending/javascript.atom' }
];

export async function fetchRssFeeds(): Promise<RawContentItem[]> {
    const promises = RSS_FEEDS.map(async (feed) => {
        try {
            // Using local Vite proxy to bypass CORS
            const proxyUrl = `/proxy?url=${encodeURIComponent(feed.url)}`;
            const response = await fetch(proxyUrl, {
                headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
                // Add a timeout to prevent hanging on slow proxies
                signal: AbortSignal.timeout(8000)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const text = await response.text();

            // Native browser XML parsing
            const parser = new window.DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");

            const items = Array.from(xmlDoc.querySelectorAll('item, entry')).slice(0, 5);

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
