// ============================================================
// Delta AI — Chat API Edge Function
// Route: POST /chat
// Proxies Gemini calls server-side so API key never reaches client
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getServiceClient, getAuthUserId } from '../_shared/supabase.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_MODEL = 'gemini-2.0-flash';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const userId = await getAuthUserId(req);
    if (!userId) return errorResponse('Unauthorized', 401);

    const body = await req.json();
    const { message, history, context } = body;

    if (!message) return errorResponse('message required', 400);

    // Build Gemini request
    const db = getServiceClient();

    // Get user profile for personalisation
    const { data: profile } = await db
      .from('user_profiles')
      .select('display_name, role, goals, ai_level')
      .eq('id', userId)
      .single();

    const userName = profile?.display_name || 'there';
    const userRole = profile?.role || 'professional';
    const userGoals = (profile?.goals || []).join(', ') || 'learning AI';
    const aiLevel = profile?.ai_level || 'Beginner';

    // Get recent news for RAG context
    const { data: recentNews } = await db
      .from('news_items')
      .select('headline, summary, news_type')
      .order('published_at', { ascending: false })
      .limit(10);

    const newsContext = (recentNews || [])
      .map((n: any) => `- [${n.news_type}] ${n.headline}: ${n.summary}`)
      .join('\n');

    // Get curated tools for context
    const { data: tools } = await db
      .from('tools')
      .select('name, tagline')
      .eq('status', 'live')
      .order('views_count', { ascending: false })
      .limit(21);

    const toolsContext = (tools || [])
      .map((t: any) => `- ${t.name}: ${t.tagline}`)
      .join('\n');

    // Build system message
    const systemMsg = {
      role: 'user',
      parts: [{
        text: `You are Delta AI, a friendly and knowledgeable AI learning assistant inside the Delta app. The user's name is ${userName}, they are a ${userRole}. Their goals are: ${userGoals}. Their AI level is: ${aiLevel}.

Your personality:
- Warm and direct — use their name, use emoji occasionally
- Give concrete recommendations, never vague advice
- When they ask about tools, recommend specific ones from your knowledge
- Never say "As an AI..." — just be helpful
- Keep responses concise (max 3 paragraphs)

LATEST AI NEWS (RAG CONTEXT):
${newsContext}

DELTA APP CURATED TOOLS:
${toolsContext}`,
      }],
    };

    const modelResponse = {
      role: 'model',
      parts: [{
        text: `Hey ${userName}! 👋 I'm Delta, your AI learning companion. Ask me anything about AI tools, the latest news, or what to learn next!`,
      }],
    };

    // Build full conversation
    const contents = [systemMsg, modelResponse];

    // Add history if provided
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    // Add current message with optional context
    let userMessage = message;
    if (context && context.length > 0) {
      userMessage += `\n\nSTRICT CONTEXT FOR THIS REPLY:\n${JSON.stringify(context.map((u: any) => ({ title: u.title, summary: u.summary })))}`;
    }
    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    // Call Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      console.error('[Chat] Gemini error:', geminiRes.status, errData);
      return errorResponse('AI service temporarily unavailable', 503);
    }

    const geminiData = await geminiRes.json();
    const reply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
      || "I couldn't generate a response. Try asking something else!";

    // Check if response mentions any tools — include inline lesson suggestions
    const mentionedTools: string[] = [];
    const toolNames = (tools || []).map((t: any) => t.name.toLowerCase());
    const replyLower = reply.toLowerCase();
    for (const name of toolNames) {
      if (replyLower.includes(name)) {
        mentionedTools.push(name);
      }
    }

    return jsonResponse({
      reply,
      mentioned_tools: mentionedTools,
    });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});
