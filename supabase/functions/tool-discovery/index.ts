// ============================================================
// Delta AI — Tool Discovery Pipeline
// Scheduled daily: discovers new AI tools from multiple sources
// Sources: Product Hunt, GitHub Trending, Reddit, HN, Newsletters
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

const db = getServiceClient();

// ---- Source: Hacker News "Show HN" AI posts ----
async function discoverFromHN(): Promise<{ url: string; name: string; source: string }[]> {
  const results: { url: string; name: string; source: string }[] = [];
  try {
    const res = await fetch('https://hn.algolia.com/api/v1/search?query=Show%20HN%20AI&tags=show_hn&hitsPerPage=20');
    if (!res.ok) return results;
    const data = await res.json();

    for (const hit of data.hits || []) {
      if (hit.url && hit.points > 30) {
        results.push({
          url: hit.url,
          name: hit.title?.replace(/^Show HN:\s*/i, '').split(/[–—:-]/)[0].trim() || hit.url,
          source: 'hacker_news',
        });
      }
    }
  } catch (e) {
    console.warn('[Discovery] HN fetch failed:', e);
  }
  return results;
}

// ---- Source: Reddit AI tool subreddits ----
async function discoverFromReddit(): Promise<{ url: string; name: string; source: string }[]> {
  const results: { url: string; name: string; source: string }[] = [];
  const subreddits = ['MachineLearning', 'LocalLLaMA', 'artificial', 'OpenAI', 'ChatGPT'];

  for (const sub of subreddits) {
    try {
      const res = await fetch(`https://www.reddit.com/r/${sub}/top.json?t=day&limit=10`, {
        headers: { 'User-Agent': 'DeltaAI/1.0' },
      });
      if (!res.ok) continue;
      const data = await res.json();

      for (const child of data.data?.children || []) {
        const post = child.data;
        // Look for posts that mention specific tool URLs
        if (post.url && !post.url.includes('reddit.com') && post.ups > 50) {
          const urlDomain = new URL(post.url).hostname;
          // Skip common non-tool domains
          if (['arxiv.org', 'youtube.com', 'twitter.com', 'x.com', 'imgur.com'].some(d => urlDomain.includes(d))) continue;

          results.push({
            url: post.url,
            name: post.title?.split(/[–—:-]/)[0].trim() || urlDomain,
            source: 'reddit',
          });
        }
      }
    } catch (e) {
      console.warn(`[Discovery] Reddit r/${sub} failed:`, e);
    }
  }
  return results;
}

// ---- Source: GitHub Trending AI repos ----
async function discoverFromGitHub(): Promise<{ url: string; name: string; source: string }[]> {
  const results: { url: string; name: string; source: string }[] = [];
  try {
    // Use GitHub search API for recently created AI repos with stars
    const res = await fetch('https://api.github.com/search/repositories?q=topic:ai+topic:tool+stars:>100+pushed:>2024-01-01&sort=stars&order=desc&per_page=15', {
      headers: { 'User-Agent': 'DeltaAI/1.0' },
    });
    if (!res.ok) return results;
    const data = await res.json();

    for (const repo of data.items || []) {
      // Prefer homepage URL, fallback to repo URL
      const url = repo.homepage || repo.html_url;
      if (url) {
        results.push({
          url,
          name: repo.name,
          source: 'github_trending',
        });
      }
    }
  } catch (e) {
    console.warn('[Discovery] GitHub fetch failed:', e);
  }
  return results;
}

// ---- Source: Product Hunt AI category (RSS — no API key needed) ----
async function discoverFromProductHunt(): Promise<{ url: string; name: string; source: string }[]> {
  const results: { url: string; name: string; source: string }[] = [];
  try {
    const res = await fetch('https://www.producthunt.com/feed?category=artificial-intelligence', {
      headers: { 'User-Agent': 'DeltaAI/1.0' },
    });
    if (!res.ok) return results;
    const xml = await res.text();

    // Parse RSS <item> blocks
    const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    for (const match of itemMatches) {
      const block = match[1];
      const titleMatch = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/);
      const linkMatch = block.match(/<link>(https?:\/\/[^<]+)<\/link>/);

      if (!titleMatch || !linkMatch) continue;

      const url = linkMatch[1].trim().replace(/\/+$/, '');
      if (url.includes('producthunt.com')) continue; // skip PH-internal links

      results.push({ url, name: titleMatch[1].trim(), source: 'product_hunt' });
      if (results.length >= 20) break;
    }
  } catch (e) {
    console.warn('[Discovery] Product Hunt fetch failed:', e);
  }
  return results;
}

// ---- Deduplication check ----
async function isAlreadyKnown(url: string): Promise<boolean> {
  const domain = new URL(url).hostname.replace('www.', '');

  // Check tools table
  const { data: existingTool } = await db
    .from('tools')
    .select('id')
    .ilike('website_url', `%${domain}%`)
    .limit(1);
  if (existingTool && existingTool.length > 0) return true;

  // Check discovery queue
  const { data: existingQueue } = await db
    .from('discovery_queue')
    .select('id')
    .eq('url', url)
    .limit(1);
  if (existingQueue && existingQueue.length > 0) return true;

  return false;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    console.log('[Discovery] Starting tool discovery pipeline...');

    // Discover from all sources in parallel
    const [hnResults, redditResults, githubResults, phResults] = await Promise.allSettled([
      discoverFromHN(),
      discoverFromReddit(),
      discoverFromGitHub(),
      discoverFromProductHunt(),
    ]);

    const allCandidates = [
      ...(hnResults.status === 'fulfilled' ? hnResults.value : []),
      ...(redditResults.status === 'fulfilled' ? redditResults.value : []),
      ...(githubResults.status === 'fulfilled' ? githubResults.value : []),
      ...(phResults.status === 'fulfilled' ? phResults.value : []),
    ];

    console.log(`[Discovery] Found ${allCandidates.length} candidates across all sources`);

    // Deduplicate by URL and check against existing tools
    const seen = new Set<string>();
    let added = 0;
    let skipped = 0;

    for (const candidate of allCandidates) {
      try {
        const normalizedUrl = candidate.url.replace(/\/+$/, '');
        if (seen.has(normalizedUrl)) { skipped++; continue; }
        seen.add(normalizedUrl);

        if (await isAlreadyKnown(normalizedUrl)) { skipped++; continue; }

        // Add to discovery queue
        await db.from('discovery_queue').upsert({
          url: normalizedUrl,
          candidate_name: candidate.name,
          source: candidate.source,
          status: 'pending',
        }, { onConflict: 'url' });

        added++;
      } catch (e) {
        console.warn(`[Discovery] Failed to process candidate ${candidate.url}:`, e);
      }
    }

    const summary = {
      total_candidates: allCandidates.length,
      added_to_queue: added,
      skipped_duplicates: skipped,
      sources: {
        hacker_news:   hnResults.status     === 'fulfilled' ? hnResults.value.length     : 0,
        reddit:        redditResults.status === 'fulfilled' ? redditResults.value.length : 0,
        github:        githubResults.status === 'fulfilled' ? githubResults.value.length : 0,
        product_hunt:  phResults.status     === 'fulfilled' ? phResults.value.length     : 0,
      },
    };

    console.log('[Discovery] Complete:', summary);
    return jsonResponse(summary);
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});
