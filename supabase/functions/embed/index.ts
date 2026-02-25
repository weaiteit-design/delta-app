// ============================================================
// Delta AI — Embedding Generator (Gemini text-embedding-004)
// Called internally by ingestion pipeline to generate tool embeddings
// Route: POST /embed  { texts: string[] }
// Returns: { embeddings: number[][] }
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const EMBEDDING_MODEL = 'text-embedding-004';

async function generateEmbedding(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: {
        parts: [{ text }],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini embedding failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.embedding.values; // number[] of 768 dimensions
}

async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${GEMINI_API_KEY}`;

  const requests = texts.map(text => ({
    model: `models/${EMBEDDING_MODEL}`,
    content: {
      parts: [{ text }],
    },
  }));

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });

  if (!res.ok) {
    // Fall back to sequential if batch fails
    console.warn('[Embed] Batch failed, falling back to sequential');
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await generateEmbedding(text));
    }
    return results;
  }

  const data = await res.json();
  return data.embeddings.map((e: any) => e.values);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  if (!GEMINI_API_KEY) return errorResponse('GEMINI_API_KEY not configured', 500);

  try {
    const body = await req.json();
    const { texts, text } = body;

    // Single text embedding
    if (text && typeof text === 'string') {
      const embedding = await generateEmbedding(text);
      return jsonResponse({ embedding, dimensions: embedding.length });
    }

    // Batch embeddings
    if (texts && Array.isArray(texts) && texts.length > 0) {
      if (texts.length > 100) return errorResponse('Max 100 texts per batch', 400);
      const embeddings = await generateBatchEmbeddings(texts);
      return jsonResponse({ embeddings, dimensions: embeddings[0]?.length || 768 });
    }

    return errorResponse('Provide "text" (string) or "texts" (string[])', 400);
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});
