import { RawContentItem } from '../../../shared/types/types';

const NEWSDATA_API_KEY = import.meta.env.VITE_NEWSDATA_API_KEY || '';

export async function fetchNewsDataArticles(): Promise<RawContentItem[]> {
    if (!NEWSDATA_API_KEY) return [];

    const url = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&q=AI%20OR%20"Artificial%20Intelligence"&language=en`;

    try {
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();

        return (data.results || []).map((a: any) => ({
            id: `newsdata-${a.article_id}`,
            source: 'newsdata',
            title: a.title,
            summary: a.description || a.content || '',
            url: a.link,
            publishedAt: a.pubDate,
            author: a.source_id,
            imageUrl: a.image_url,
            contentHash: a.article_id,
            rawData: a
        }));
    } catch (e) {
        console.warn('[NewsData] Fetch failed:', e);
        return [];
    }
}
