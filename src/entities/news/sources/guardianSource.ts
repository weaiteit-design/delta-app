import { RawContentItem } from '../../../shared/types/types';

const GUARDIAN_API_KEY = import.meta.env.VITE_GUARDIAN_API_KEY || '';

export async function fetchGuardianArticles(): Promise<RawContentItem[]> {
    if (!GUARDIAN_API_KEY) return [];

    const url = `https://content.guardianapis.com/search?q=AI%20OR%20"Artificial%20Intelligence"&show-fields=trailText,byline&api-key=${GUARDIAN_API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();

        return (data.response?.results || []).map((a: any) => ({
            id: `guardian-${a.id}`,
            source: 'guardian',
            title: a.webTitle,
            summary: a.fields?.trailText || '',
            url: a.webUrl,
            publishedAt: a.webPublicationDate,
            author: a.fields?.byline || 'The Guardian',
            contentHash: a.id,
            rawData: a
        }));
    } catch (e) {
        console.warn('[Guardian] Fetch failed:', e);
        return [];
    }
}
