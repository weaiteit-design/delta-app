import { RawContentItem } from '../../../shared/types/types';

const NEWS_API_KEY = import.meta.env.VITE_NEWS_API_KEY || '';

export async function fetchNewsApiArticles(): Promise<RawContentItem[]> {
    if (!NEWS_API_KEY) return [];

    const url = `https://newsapi.org/v2/everything?q=AI OR LLM OR "Artificial Intelligence"&language=en&sortBy=publishedAt&pageSize=40&apiKey=${NEWS_API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();

        return (data.articles || []).map((a: any) => ({
            id: `newsapi-${a.url}`,
            source: 'newsapi',
            title: a.title,
            summary: a.description || a.content || '',
            url: a.url,
            publishedAt: a.publishedAt,
            author: a.author,
            imageUrl: a.urlToImage,
            contentHash: a.url,
            rawData: a
        }));
    } catch (e) {
        console.warn('[NewsAPI] Fetch failed:', e);
        return [];
    }
}
