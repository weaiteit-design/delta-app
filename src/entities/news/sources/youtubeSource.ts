import { RawContentItem } from '../../../shared/types/types';

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || '';

export async function fetchYouTubeVideos(): Promise<RawContentItem[]> {
    if (!YOUTUBE_API_KEY) return [];

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=AI+tools+tutorial+new+features&type=video&order=date&key=${YOUTUBE_API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();

        return (data.items || []).map((v: any) => ({
            id: `yt-${v.id.videoId}`,
            source: 'youtube',
            title: v.snippet.title,
            summary: v.snippet.description || '',
            url: `https://youtube.com/watch?v=${v.id.videoId}`,
            publishedAt: v.snippet.publishedAt,
            author: v.snippet.channelTitle,
            imageUrl: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.default?.url,
            contentHash: v.id.videoId,
            rawData: v
        }));
    } catch (e) {
        console.warn('[YouTube] Fetch failed:', e);
        return [];
    }
}
