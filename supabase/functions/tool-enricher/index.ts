// ============================================================
// Delta AI — Tool Enricher Pipeline
// Processes items from discovery_queue:
// 1. Fetch homepage
// 2. LLM extraction (Gemini)
// 3. Generate embedding (Gemini text-embedding-004)
// 4. Auto-categorise tasks
// 5. Fetch logo
// 6. Compute role_scores
// 7. Insert into tools table
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

const db = getServiceClient();
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_MODEL = 'gemini-2.0-flash';
const EMBEDDING_MODEL = 'text-embedding-004';

// ---- Fetch and clean webpage ----
async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 DeltaAI/1.0' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  // Basic HTML to text (strip tags, collapse whitespace)
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000); // Limit context
}

// ---- Gemini structured extraction ----
async function extractToolData(pageText: string, url: string, candidateName: string) {
  const prompt = `You are an AI tool analyst. Extract structured information about this AI tool from its homepage text.

URL: ${url}
Candidate name: ${candidateName}
Homepage text (first 8000 chars):
${pageText}

Return ONLY valid JSON:
{
  "name": "Official tool name",
  "tagline": "One-line description (max 80 chars)",
  "description": "2-3 sentence description of what it does and who it's for (80-200 words)",
  "pricing_model": "Free|Freemium|Paid|Free_Trial|Contact",
  "price_from": null or number (starting monthly price in USD),
  "platforms": ["web", "ios", "android", "mac", "windows", "linux", "api"],
  "inputs": ["text", "image", "audio", "video", "code", "documents"],
  "outputs": ["text", "image", "audio", "video", "code", "data"],
  "use_cases": ["use case 1", "use case 2", "use case 3"],
  "best_for": ["role 1", "role 2"],
  "delta_analysis": "One sharp sentence: Delta's editorial take on this tool (why it matters, who should care)",
  "role_scores": {
    "Student": 0-10,
    "Non-Technical Pro": 0-10,
    "Technical Pro": 0-10,
    "Founder": 0-10,
    "Creator & Marketer": 0-10
  },
  "task_slugs": ["matching-task-slug-1", "matching-task-slug-2"],
  "country_code": "US or relevant 2-letter code",
  "confidence": 0.0-1.0
}

For task_slugs, choose from: ai-writing, ai-image-generation, ai-coding, ai-research, ai-video, ai-audio, ai-productivity, ai-marketing, ai-design, ai-data-analysis, ai-education, ai-customer-support, copywriting, blog-writing, email-writing, text-to-image, image-editing, code-completion, code-review, app-building, debugging, no-code-building, web-research, text-to-video, video-editing, text-to-speech, voice-cloning, music-generation, transcription, task-automation, meeting-notes, document-analysis, seo-optimization, ad-generation, brand-content.

If you cannot determine a field, use null. Be conservative with confidence — only 0.9+ if the page clearly describes an AI tool.`;

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!res.ok) throw new Error(`Gemini extraction failed: ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');

  return JSON.parse(text);
}

// ---- Generate embedding ----
async function generateEmbedding(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
    }),
  });

  if (!res.ok) throw new Error(`Embedding failed: ${res.status}`);
  const data = await res.json();
  return data.embedding.values;
}

// ---- Fetch logo ----
function getLogoUrl(domain: string): string {
  // Clearbit Logo API (free, public)
  return `https://logo.clearbit.com/${domain}`;
}

// ---- Slug generator ----
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ---- Check for fuzzy duplicate ----
async function checkDuplicate(name: string, domain: string): Promise<boolean> {
  // Exact domain match
  const { data: domainMatch } = await db
    .from('tools')
    .select('id')
    .ilike('website_url', `%${domain}%`)
    .limit(1);
  if (domainMatch && domainMatch.length > 0) return true;

  // Exact name match
  const { data: nameMatch } = await db
    .from('tools')
    .select('id')
    .ilike('name', name)
    .limit(1);
  if (nameMatch && nameMatch.length > 0) return true;

  return false;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    // Get pending items from discovery queue
    const batchSize = parseInt(new URL(req.url).searchParams.get('batch') || '5');

    const { data: queue, error } = await db
      .from('discovery_queue')
      .select('*')
      .eq('status', 'pending')
      .order('discovered_at', { ascending: true })
      .limit(batchSize);

    if (error) return errorResponse(error.message, 500);
    if (!queue || queue.length === 0) return jsonResponse({ message: 'No pending items', processed: 0 });

    const results = [];

    for (const item of queue) {
      try {
        // Mark as fetching
        await db.from('discovery_queue').update({ status: 'fetching' }).eq('id', item.id);

        const domain = new URL(item.url).hostname.replace('www.', '');

        // Check duplicate
        if (await checkDuplicate(item.candidate_name, domain)) {
          await db.from('discovery_queue').update({ status: 'duplicate' }).eq('id', item.id);
          results.push({ url: item.url, status: 'duplicate' });
          continue;
        }

        // Fetch page
        await db.from('discovery_queue').update({ status: 'parsing' }).eq('id', item.id);
        const pageText = await fetchPageText(item.url);

        // Extract structured data
        const extracted = await extractToolData(pageText, item.url, item.candidate_name);

        // Validate confidence
        if (extracted.confidence < 0.5) {
          await db.from('discovery_queue').update({
            status: 'rejected',
            error_msg: `Low confidence: ${extracted.confidence}`,
          }).eq('id', item.id);
          results.push({ url: item.url, status: 'rejected', reason: 'low_confidence' });
          continue;
        }

        // Mark as enriching
        await db.from('discovery_queue').update({ status: 'enriching' }).eq('id', item.id);

        // Generate embedding
        const embeddingText = `${extracted.name} ${extracted.tagline} ${extracted.description}`;
        const embedding = await generateEmbedding(embeddingText);

        // Get logo
        const logoUrl = getLogoUrl(domain);

        // Find or create organisation
        let orgId = null;
        const { data: existingOrg } = await db
          .from('organisations')
          .select('id')
          .ilike('website_url', `%${domain}%`)
          .limit(1);

        if (existingOrg && existingOrg.length > 0) {
          orgId = existingOrg[0].id;
        }

        // Determine status based on confidence
        const status = extracted.confidence >= 0.9 ? 'live' : 'pending_review';
        const slug = toSlug(extracted.name);

        // Insert tool
        const { data: newTool, error: insertErr } = await db
          .from('tools')
          .insert({
            slug,
            name: extracted.name,
            tagline: extracted.tagline,
            description: extracted.description,
            logo_url: logoUrl,
            website_url: item.url,
            org_id: orgId,
            status,
            pricing_model: extracted.pricing_model || 'Freemium',
            price_from: extracted.price_from,
            platforms: extracted.platforms || ['web'],
            inputs: extracted.inputs,
            outputs: extracted.outputs,
            use_cases: extracted.use_cases,
            best_for: extracted.best_for,
            delta_analysis: extracted.delta_analysis,
            role_scores: extracted.role_scores || {},
            country_code: extracted.country_code,
            embed_vector: `[${embedding.join(',')}]`,
            ingestion_confidence: extracted.confidence,
          })
          .select()
          .single();

        if (insertErr) throw insertErr;

        // Link to tasks
        if (extracted.task_slugs && extracted.task_slugs.length > 0) {
          for (let i = 0; i < extracted.task_slugs.length; i++) {
            const { data: task } = await db
              .from('tasks')
              .select('id')
              .eq('slug', extracted.task_slugs[i])
              .single();

            if (task) {
              await db.from('tool_tasks').upsert({
                tool_id: newTool.id,
                task_id: task.id,
                is_primary: i === 0,
                confidence: extracted.confidence,
              });
            }
          }
        }

        // Mark queue item as ready
        await db.from('discovery_queue').update({
          status: 'ready',
          processed_at: new Date().toISOString(),
        }).eq('id', item.id);

        results.push({
          url: item.url,
          status: 'success',
          tool_slug: slug,
          confidence: extracted.confidence,
          auto_approved: status === 'live',
        });

      } catch (e) {
        console.error(`[Enricher] Failed for ${item.url}:`, e);
        await db.from('discovery_queue').update({
          status: 'rejected',
          error_msg: e.message?.slice(0, 500),
        }).eq('id', item.id);
        results.push({ url: item.url, status: 'error', error: e.message });
      }
    }

    return jsonResponse({
      processed: results.length,
      results,
    });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});
