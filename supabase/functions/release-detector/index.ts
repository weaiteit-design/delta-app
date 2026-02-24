// ============================================================
// Delta AI — Release Detector
// Monitors AI company RSS feeds for new releases/updates
// Creates release records + news_items for significant changes
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

const db = getServiceClient();

// AI company blog RSS feeds to monitor
const RSS_FEEDS = [
  { url: 'https://openai.com/blog/rss.xml', org: 'openai', name: 'OpenAI' },
  { url: 'https://www.anthropic.com/rss.xml', org: 'anthropic', name: 'Anthropic' },
  { url: 'https://blog.google/technology/ai/rss/', org: 'google', name: 'Google AI' },
  { url: 'https://ai.meta.com/blog/rss/', org: 'meta', name: 'Meta AI' },
  { url: 'https://mistral.ai/feed.xml', org: 'mistral', name: 'Mistral AI' },
  { url: 'https://stability.ai/blog/rss.xml', org: 'stability', name: 'Stability AI' },
  { url: 'https://elevenlabs.io/blog/rss/', org: 'elevenlabs', name: 'ElevenLabs' },
  { url: 'https://runwayml.com/blog/rss/', org: 'runwayml', name: 'Runway' },
  { url: 'https://vercel.com/blog/rss.xml', org: 'vercel', name: 'Vercel' },
  { url: 'https://www.cursor.com/blog/rss.xml', org: 'cursor', name: 'Cursor' },
];

// Version detection regex
const VERSION_REGEX = /v?(\d+\.?\d*\.?\d*)/i;
const RELEASE_KEYWORDS = ['release', 'launch', 'announcing', 'introducing', 'new', 'update', 'version', 'v2', 'v3', 'v4', 'ships', 'available'];

// Simple RSS parser (works with both RSS and Atom)
function parseRSSItems(xml: string): { title: string; link: string; pubDate: string; description: string }[] {
  const items: { title: string; link: string; pubDate: string; description: string }[] = [];

  // Try RSS <item> format
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi);
  for (const match of itemMatches) {
    const itemXml = match[1];
    const title = itemXml.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1] || '';
    const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || '';
    const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
    const description = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1] || '';
    items.push({ title, link, pubDate, description: description.slice(0, 500) });
  }

  // Try Atom <entry> format
  if (items.length === 0) {
    const entryMatches = xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi);
    for (const match of entryMatches) {
      const entryXml = match[1];
      const title = entryXml.match(/<title[^>]*>(.*?)<\/title>/)?.[1] || '';
      const link = entryXml.match(/<link[^>]*href="([^"]+)"/)?.[1] || '';
      const pubDate = entryXml.match(/<published>(.*?)<\/published>/)?.[1]
        || entryXml.match(/<updated>(.*?)<\/updated>/)?.[1] || '';
      const description = entryXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)?.[1] || '';
      items.push({ title, link, pubDate, description: description.slice(0, 500) });
    }
  }

  return items;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    console.log('[ReleaseDetector] Starting feed scan...');

    const results = {
      feeds_checked: 0,
      new_releases: 0,
      new_news_items: 0,
      errors: [] as string[],
    };

    for (const feed of RSS_FEEDS) {
      try {
        const res = await fetch(feed.url, {
          headers: { 'User-Agent': 'DeltaAI/1.0' },
        });

        if (!res.ok) {
          results.errors.push(`${feed.name}: HTTP ${res.status}`);
          continue;
        }

        const xml = await res.text();
        const items = parseRSSItems(xml);
        results.feeds_checked++;

        // Only process items from the last 48 hours
        const cutoff = Date.now() - 48 * 60 * 60 * 1000;

        for (const item of items.slice(0, 5)) {
          const pubDate = new Date(item.pubDate);
          if (pubDate.getTime() < cutoff) continue;

          const titleLower = item.title.toLowerCase();
          const isRelease = RELEASE_KEYWORDS.some(k => titleLower.includes(k));
          if (!isRelease) continue;

          // Extract version if present
          const versionMatch = item.title.match(VERSION_REGEX);
          const version = versionMatch?.[1] || null;

          // Find related tool by org
          const { data: orgTools } = await db
            .from('tools')
            .select('id, slug, name')
            .eq('org_id', (
              await db.from('organisations').select('id').eq('slug', feed.org).single()
            ).data?.id)
            .eq('status', 'live');

          // Match tool by checking if title mentions tool name
          let relatedToolId = null;
          let relatedToolName = '';
          for (const tool of orgTools || []) {
            if (titleLower.includes(tool.name.toLowerCase()) || titleLower.includes(tool.slug)) {
              relatedToolId = tool.id;
              relatedToolName = tool.name;
              break;
            }
          }

          // If no specific tool match, use the first tool from the org
          if (!relatedToolId && orgTools && orgTools.length > 0) {
            relatedToolId = orgTools[0].id;
            relatedToolName = orgTools[0].name;
          }

          // Create release record if version detected and tool found
          if (version && relatedToolId) {
            const { error: releaseErr } = await db.from('releases').upsert({
              tool_id: relatedToolId,
              version,
              release_date: pubDate.toISOString().split('T')[0],
              changelog: [item.title],
              is_latest: true,
            }, { onConflict: 'tool_id,version' });

            if (!releaseErr) {
              results.new_releases++;
              // Update tool version
              await db.from('tools').update({ version }).eq('id', relatedToolId);
            }
          }

          // Create news item
          // Check if already exists by source_url
          const { data: existing } = await db
            .from('news_items')
            .select('id')
            .eq('source_url', item.link)
            .limit(1);

          if (!existing || existing.length === 0) {
            // Calculate FOMO score
            let fomoScore = 5;
            if (titleLower.includes('launch') || titleLower.includes('introducing')) fomoScore = 8;
            if (version?.startsWith('2') || version?.startsWith('3') || version?.startsWith('4')) fomoScore = 9;
            if (titleLower.includes('free') || titleLower.includes('open source')) fomoScore = 7;

            await db.from('news_items').insert({
              headline: item.title,
              summary: item.description.replace(/<[^>]+>/g, '').slice(0, 500),
              source_name: feed.name,
              source_url: item.link,
              news_type: version ? 'major_release' : 'tool-update',
              fomo_score: fomoScore,
              actionability: 7,
              related_tool_id: relatedToolId,
              published_at: pubDate.toISOString(),
              is_featured: fomoScore >= 8,
            });

            results.new_news_items++;
          }
        }
      } catch (e) {
        results.errors.push(`${feed.name}: ${e.message}`);
      }
    }

    console.log('[ReleaseDetector] Complete:', results);
    return jsonResponse(results);
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});
