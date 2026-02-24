// ============================================
// Delta — AI Service (Gemini-powered)
// Chat, lesson generation, tool discovery
// ============================================

import { LessonData, ToolData, ChatMessage, VerifiedUpdate } from '../types/types';
import { storageService } from '../../entities/user/storageService';
import { fetchCachedContent, upsertContentCache, CachedContentRow } from './supabaseClient';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || '';
const GEMINI_MODEL = 'gemini-1.5-flash'; // Main model for reasoning and chat
const GEMINI_LITE_MODEL = 'gemini-1.5-flash-8b'; // High-volume model for lesson generation

// ---- Gemini direct REST call ----
export async function geminiCall(prompt: string, jsonMode = false): Promise<string | null> {
    if (!GEMINI_API_KEY) {
        console.warn('[DeltaService] No Gemini API key — demo mode');
        return null;
    }

    const modelToUse = jsonMode ? GEMINI_LITE_MODEL : GEMINI_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: jsonMode ? { responseMimeType: 'application/json' } : {},
            }),
        });

        if (!response.ok) {
            console.error('[Gemini] API Error:', response.status);
            return null;
        }

        const data = await response.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (e) {
        console.error('[Gemini] Call failed:', e);
        return null;
    }
}

function parseJSON<T>(text: string | null): T | null {
    if (!text) return null;
    try {
        // Try direct parse
        try { return JSON.parse(text); } catch { }
        // Try extracting from code block
        const m = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (m) try { return JSON.parse(m[1]); } catch { }
        // Try finding JSON structure
        const start = Math.min(
            text.indexOf('{') === -1 ? Infinity : text.indexOf('{'),
            text.indexOf('[') === -1 ? Infinity : text.indexOf('[')
        );
        const endBrace = text.lastIndexOf('}');
        const endBracket = text.lastIndexOf(']');
        const end = Math.max(endBrace, endBracket);
        if (start !== Infinity && end > start) {
            return JSON.parse(text.substring(start, end + 1));
        }
        return null;
    } catch { return null; }
}

// ============================================
// CURATED TOOLS (Feb 2026 Edition)
// ============================================
export const CURATED_TOOLS: ToolData[] = [
    {
        id: 'tool-1', name: 'Claude', description: 'AI assistant for writing & analysis',
        category: 'Writing', tag: 'writing', domain: 'claude.ai', url: 'https://claude.ai',
        matchScore: 96, mastery: 2, logoUrl: 'https://www.google.com/s2/favicons?domain=claude.ai&sz=128',
        deltaAnalysis: 'If you code or write professionally, this is your daily driver.',
        useCases: ['Full-Stack Development', 'Novel Writing', 'Research Synthesis'],
        bestFor: ['Developers', 'Writers', 'Creators'],
        pricing: { model: 'freemium', startingPrice: '$20/mo', freeDetails: 'Limited messages/day' },
    },
    {
        id: 'tool-2', name: 'ChatGPT', description: 'Versatile AI assistant by OpenAI',
        category: 'General', tag: 'general', domain: 'openai.com', url: 'https://openai.com',
        matchScore: 94, mastery: 3, logoUrl: 'https://www.google.com/s2/favicons?domain=openai.com&sz=128',
        deltaAnalysis: 'The global standard. Instant Reasoning and deep agentic workflows.',
        useCases: ['Complex Planning', 'Agent Orchestration', 'Multimodal Analysis'],
        bestFor: ['Everyone'],
        pricing: { model: 'freemium', startingPrice: '$20/mo', freeDetails: 'GPT-4o mini free' },
    },
    {
        id: 'tool-3', name: 'Cursor', description: 'AI-first code editor',
        category: 'Coding', tag: 'coding', domain: 'cursor.com', url: 'https://cursor.com',
        matchScore: 92, mastery: 1, logoUrl: 'https://www.google.com/s2/favicons?domain=cursor.com&sz=128',
        deltaAnalysis: 'Essential. It writes 40% of your code for you.',
        useCases: ['Software Engineering', 'Refactoring', 'Bug Fixing'],
        bestFor: ['Developers'],
        pricing: { model: 'freemium', startingPrice: '$20/mo', freeDetails: '2000 completions free' },
    },
    {
        id: 'tool-4', name: 'Perplexity', description: 'AI-powered answer engine',
        category: 'Research', tag: 'research', domain: 'perplexity.ai', url: 'https://perplexity.ai',
        matchScore: 90, mastery: 2, logoUrl: 'https://www.google.com/s2/favicons?domain=perplexity.ai&sz=128',
        deltaAnalysis: 'Google is for links. Perplexity is for answers.',
        useCases: ['Deep Dives', 'Fact Checking', 'Academic Citations'],
        bestFor: ['Researchers', 'Students'],
        pricing: { model: 'freemium', startingPrice: '$20/mo', freeDetails: '5 Pro searches/day' },
    },
    {
        id: 'tool-5', name: 'Midjourney', description: 'Photorealistic AI image generation',
        category: 'Images', tag: 'images', domain: 'midjourney.com', url: 'https://midjourney.com',
        matchScore: 88, mastery: 1, logoUrl: 'https://www.google.com/s2/favicons?domain=midjourney.com&sz=128',
        deltaAnalysis: 'Renders text perfectly and understands nuance better than any other model.',
        useCases: ['Cinematic Stills', 'Short Video Clips', '3D Assets'],
        bestFor: ['Designers', 'Filmmakers'],
        pricing: { model: 'paid', startingPrice: '$10/mo' },
    },
    {
        id: 'tool-6', name: 'Gemini', description: 'Google\'s multimodal AI with 10M+ context',
        category: 'General', tag: 'general', domain: 'gemini.google.com', url: 'https://gemini.google.com',
        matchScore: 91, mastery: 2, logoUrl: 'https://www.google.com/s2/favicons?domain=gemini.google.com&sz=128',
        deltaAnalysis: 'Unbeatable for large data context. It remembers everything.',
        useCases: ['Analyzing Entire Codebases', 'Video Processing', 'Live Translation'],
        bestFor: ['Power Users', 'Enterprises'],
        pricing: { model: 'freemium', startingPrice: '$20/mo', freeDetails: 'Gemini Flash free' },
    },
    {
        id: 'tool-7', name: 'DeepSeek', description: 'Open-source reasoning powerhouse',
        category: 'Research', tag: 'research', domain: 'deepseek.com', url: 'https://chat.deepseek.com',
        matchScore: 87, mastery: 0, logoUrl: 'https://www.google.com/s2/favicons?domain=deepseek.com&sz=128',
        deltaAnalysis: 'The industry disruptor. Incredible reasoning density.',
        useCases: ['Math Proofs', 'Local LLM Logic', 'Cost-Efficient Analysis'],
        bestFor: ['Researchers', 'Open Source Fans'],
        pricing: { model: 'free', freeDetails: '100% free to use' },
    },
    {
        id: 'tool-8', name: 'Sora', description: 'Hollywood-quality AI video generation',
        category: 'Images', tag: 'images', domain: 'openai.com', url: 'https://openai.com/sora',
        matchScore: 85, mastery: 0, isNew: true, logoUrl: 'https://www.google.com/s2/favicons?domain=openai.com&sz=128',
        deltaAnalysis: 'Mind-blowing physics simulation.',
        useCases: ['Marketing Ads', 'Film prototyping', 'Social Content'],
        bestFor: ['Creators'],
        pricing: { model: 'freemium', startingPrice: '$20/mo', freeDetails: 'Included with ChatGPT Plus' },
    },
    {
        id: 'tool-9', name: 'Runway', description: 'Professional AI video editing',
        category: 'Images', tag: 'images', domain: 'runwayml.com', url: 'https://runwayml.com',
        matchScore: 84, mastery: 0, logoUrl: 'https://www.google.com/s2/favicons?domain=runwayml.com&sz=128',
        deltaAnalysis: 'Best control for character movement in AI video.',
        useCases: ['Short Films', 'Marketing', 'Social Content'],
        bestFor: ['Creators', 'Filmmakers'],
        pricing: { model: 'freemium', startingPrice: '$12/mo', freeDetails: '125 free credits' },
    },
    {
        id: 'tool-10', name: 'Notion AI', description: 'AI-powered workspace for teams',
        category: 'Writing', tag: 'writing', domain: 'notion.so', url: 'https://notion.so',
        matchScore: 82, mastery: 1, logoUrl: 'https://www.google.com/s2/favicons?domain=notion.so&sz=128',
        deltaAnalysis: 'Great for organising thoughts and turning notes into action.',
        useCases: ['Notes', 'Docs', 'Project Planning'],
        bestFor: ['Teams', 'Students'],
        pricing: { model: 'freemium', startingPrice: '$10/mo', freeDetails: 'Free workspace, AI add-on' },
    },
    {
        id: 'tool-11', name: 'Krea AI', description: 'Real-time image generation & upscaling',
        category: 'Images', tag: 'images', domain: 'krea.ai', url: 'https://krea.ai',
        matchScore: 80, mastery: 0, isNew: true, logoUrl: 'https://www.google.com/s2/favicons?domain=krea.ai&sz=128',
        deltaAnalysis: 'The real-time canvas is a game changer for live performance.',
        useCases: ['Live Art', 'Upscaling', 'Pattern Generation'],
        bestFor: ['Designers'],
        pricing: { model: 'freemium', startingPrice: '$5/mo', freeDetails: 'Limited generations' },
    },
    {
        id: 'tool-12', name: 'Lovable', description: 'AI-powered full-stack app builder',
        category: 'Coding', tag: 'coding', domain: 'lovable.dev', url: 'https://lovable.dev',
        matchScore: 89, mastery: 1, isNew: true, logoUrl: 'https://www.google.com/s2/favicons?domain=lovable.dev&sz=128',
        deltaAnalysis: 'Build production apps with natural language. No coding needed.',
        useCases: ['App Prototyping', 'MVP Building', 'No-Code Development'],
        bestFor: ['Founders', 'Builders'],
        pricing: { model: 'freemium', startingPrice: '$20/mo', freeDetails: '5 free deploys' },
    },
    {
        id: 'tool-13', name: 'Freepik Pikaso', description: 'Sketch-to-image in real time',
        category: 'Images', tag: 'images', domain: 'freepik.com', url: 'https://freepik.com/pikaso',
        matchScore: 78, mastery: 0, logoUrl: 'https://www.google.com/s2/favicons?domain=freepik.com&sz=128',
        deltaAnalysis: 'The fastest way to get an idea out of your head.',
        useCases: ['Concept Art', 'Rapid Prototyping'],
        bestFor: ['Designers'],
        pricing: { model: 'freemium', startingPrice: '$9/mo', freeDetails: 'Limited daily gens' },
    },
    {
        id: 'tool-14', name: 'v0', description: 'AI UI component generator by Vercel',
        category: 'Coding', tag: 'coding', domain: 'v0.dev', url: 'https://v0.dev',
        matchScore: 86, mastery: 0, isNew: true, logoUrl: 'https://www.google.com/s2/favicons?domain=v0.dev&sz=128',
        deltaAnalysis: 'Generate production-ready React components from text descriptions.',
        useCases: ['UI Prototyping', 'Component Generation', 'Design to Code'],
        bestFor: ['Developers', 'Designers'],
        pricing: { model: 'freemium', startingPrice: '$20/mo', freeDetails: 'Limited generations' },
    },
    {
        id: 'tool-15', name: 'ElevenLabs', description: 'AI voice generation & text-to-speech',
        category: 'Audio', tag: 'audio', domain: 'elevenlabs.io', url: 'https://elevenlabs.io',
        matchScore: 82, mastery: 0, isNew: false, logoUrl: 'https://www.google.com/s2/favicons?domain=elevenlabs.io&sz=128',
        deltaAnalysis: 'The most realistic AI voices. Clone your own voice in minutes.',
        useCases: ['Voice Cloning', 'Audiobooks', 'Video Narration', 'Podcasts'],
        bestFor: ['Creators', 'Marketers'],
        pricing: { model: 'freemium', startingPrice: '$5/mo', freeDetails: '10 min/month free' },
    },
    {
        id: 'tool-16', name: 'GitHub Copilot', description: 'AI pair programmer in your editor',
        category: 'Coding', tag: 'coding', domain: 'github.com', url: 'https://github.com/features/copilot',
        matchScore: 93, mastery: 1, logoUrl: 'https://www.google.com/s2/favicons?domain=github.com&sz=128',
        deltaAnalysis: 'The OG coding copilot. Still the best for inline suggestions.',
        useCases: ['Code Completion', 'Test Generation', 'Documentation'],
        bestFor: ['Developers'],
        pricing: { model: 'freemium', startingPrice: '$10/mo', freeDetails: 'Free for students' },
    },
    {
        id: 'tool-17', name: 'Canva AI', description: 'AI-powered design platform',
        category: 'Images', tag: 'images', domain: 'canva.com', url: 'https://canva.com',
        matchScore: 85, mastery: 0, logoUrl: 'https://www.google.com/s2/favicons?domain=canva.com&sz=128',
        deltaAnalysis: 'AI features baked into a tool 100M people already use.',
        useCases: ['Social Media Graphics', 'Presentations', 'Brand Design'],
        bestFor: ['Marketers', 'Non-Technical'],
        pricing: { model: 'freemium', startingPrice: '$13/mo', freeDetails: 'Basic features free' },
    },
    {
        id: 'tool-18', name: 'Jasper', description: 'Enterprise AI content platform',
        category: 'Writing', tag: 'writing', domain: 'jasper.ai', url: 'https://jasper.ai',
        matchScore: 76, mastery: 0, logoUrl: 'https://www.google.com/s2/favicons?domain=jasper.ai&sz=128',
        deltaAnalysis: 'Built for marketing teams. Brand voice + campaign orchestration.',
        useCases: ['Marketing Copy', 'Brand Content', 'Ad Generation'],
        bestFor: ['Marketers', 'Teams'],
        pricing: { model: 'paid', startingPrice: '$49/mo' },
    },
    {
        id: 'tool-19', name: 'Replit', description: 'AI-powered cloud IDE & deployment',
        category: 'Coding', tag: 'coding', domain: 'replit.com', url: 'https://replit.com',
        matchScore: 84, mastery: 0, isNew: false, logoUrl: 'https://www.google.com/s2/favicons?domain=replit.com&sz=128',
        deltaAnalysis: 'Write code, deploy instantly. The complete AI dev environment.',
        useCases: ['Rapid Prototyping', 'Learning to Code', 'Full-Stack Apps'],
        bestFor: ['Beginners', 'Builders'],
        pricing: { model: 'freemium', startingPrice: '$25/mo', freeDetails: 'Basic IDE free' },
    },
    {
        id: 'tool-20', name: 'Suno AI', description: 'AI music generation from text',
        category: 'Audio', tag: 'audio', domain: 'suno.com', url: 'https://suno.com',
        matchScore: 78, mastery: 0, isNew: true, logoUrl: 'https://www.google.com/s2/favicons?domain=suno.com&sz=128',
        deltaAnalysis: 'Type a description, get a full song. The Midjourney of music.',
        useCases: ['Music Production', 'Content Soundtracks', 'Jingles'],
        bestFor: ['Creators', 'Content Makers'],
        pricing: { model: 'freemium', startingPrice: '$10/mo', freeDetails: '10 songs/day free' },
    },
    {
        id: 'tool-21', name: 'Leonardo AI', description: 'AI image generation with fine-tuned models',
        category: 'Images', tag: 'images', domain: 'leonardo.ai', url: 'https://leonardo.ai',
        matchScore: 81, mastery: 0, isNew: false, logoUrl: 'https://www.google.com/s2/favicons?domain=leonardo.ai&sz=128',
        deltaAnalysis: 'Train custom models on your style. Best for consistent brand imagery.',
        useCases: ['Brand Assets', 'Game Art', 'Product Mockups'],
        bestFor: ['Designers', 'Game Developers'],
        pricing: { model: 'freemium', startingPrice: '$10/mo', freeDetails: '150 tokens/day free' },
    },
];

// ============================================
// DELTA SERVICE
// ============================================

async function getCachedLesson(id: string): Promise<LessonData | null> {
    try {
        const rows = await fetchCachedContent('generated_lesson');
        const match = rows.find(r => r.content_hash === id);
        if (match && match.classified_data) {
            return match.classified_data as unknown as LessonData;
        }
    } catch (e) { }
    return null;
}

function saveCachedLesson(lesson: LessonData): void {
    const row: CachedContentRow = {
        content_hash: lesson.id,
        source: 'generated_lesson',
        title: lesson.title,
        summary: lesson.preview,
        url: null,
        raw_data: null,
        classified_data: lesson as any,
        relevance_scores: null,
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };
    upsertContentCache(row);
}

class DeltaService {
    private chatHistory: { role: string; parts: { text: string }[] }[] = [];

    // ---- Delta-fication (Tone Filter) ----
    async deltafySummaries(updates: VerifiedUpdate[]): Promise<VerifiedUpdate[]> {
        if (!updates.length) return updates;

        const itemsToProcess = updates.slice(0, 10); // Process top 10 for performance
        const prompt = `You are Delta AI's senior editor. Rewrite these AI news summaries to match our "Delta Voice": premium, strictly objective, and highly actionable.
        
VOICE GUIDELINES:
- No hype (avoid: "revolutionary", "game-changing", "insane").
- Focus on the "So What?" — what can the user actually DO?
- Keep it under 150 characters per item.
- Frame it as a professional insight.

INPUT JSON:
${JSON.stringify(itemsToProcess.map(u => ({ id: u.id, title: u.title, original: u.shortSummary })))}

Return ONLY a JSON object mapping IDs to the new summaries:
{
  "update-id-1": "Rewritten summary...",
  "update-id-2": "Rewritten summary..."
}`;

        const response = await geminiCall(prompt, true);
        const mapping = parseJSON<Record<string, string>>(response);

        if (mapping) {
            return updates.map(u => ({
                ...u,
                shortSummary: mapping[u.id] || u.shortSummary
            }));
        }

        return updates;
    }

    // ---- YouTube Discovery ----
    async findYouTubeVideos(query: string): Promise<{ title: string; url: string; thumbnail: string }[]> {
        if (!YOUTUBE_API_KEY) return [];
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}`;
        try {
            const response = await fetch(url);
            if (!response.ok) return [];
            const data = await response.json();
            return (data.items || []).map((v: any) => ({
                title: v.snippet.title,
                url: `https://youtube.com/watch?v=${v.id.videoId}`,
                thumbnail: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.default?.url
            }));
        } catch (e) {
            return [];
        }
    }

    // ---- Tools (with role-based match scoring) ----
    getTools(userRole?: string): ToolData[] {
        const tools = [...CURATED_TOOLS];

        if (userRole) {
            const roleKeywords: Record<string, string[]> = {
                'Creator & Builder': ['Coding', 'Images', 'General', 'Writing'],
                'Developer': ['Coding', 'General', 'Research'],
                'Designer': ['Images', 'General', 'Writing'],
                'Writer': ['Writing', 'General', 'Research'],
                'Researcher': ['Research', 'General', 'Writing'],
                'Student': ['General', 'Research', 'Writing'],
            };

            const matchCategories = roleKeywords[userRole] || ['General'];

            return tools.map(tool => {
                let score = tool.matchScore;
                if (matchCategories.includes(tool.category)) score = Math.min(100, score + 5);
                return { ...tool, matchScore: score };
            }).sort((a, b) => b.matchScore - a.matchScore);
        }

        return tools;
    }

    // ---- Lesson Generation (Gemini-powered) ----
    async generateLesson(update: VerifiedUpdate): Promise<LessonData | null> {
        const prompt = `You are Delta AI, a premium AI tutor. Turn this AI news into a context-heavy micro-lesson that teaches the user something genuinely useful.

NEWS:
Title: ${update.title}
Summary: ${update.shortSummary}
Source: ${update.source}

RELATED VIDEOS:
${(await this.findYouTubeVideos(update.title)).map(v => `- ${v.title} (${v.url})`).join('\n')}

CRITICAL RULES FOR LESSON QUALITY:
1. Each step must be MEATY — 2-4 sentences explaining a concept, with concrete examples.
2. Include at least one "try this prompt" in the steps — an actual prompt the user can paste into ChatGPT/Claude/Gemini.
3. Explain WHY things matter, not just WHAT they are. "This matters because..." is better than "This is a feature."
4. NEVER say "create an account", "sign up", or "visit the website". The user already knows how to open a browser.
5. Focus on transferable understanding: what concept does this teach? How can they apply it today?

Return ONLY valid JSON:
{
  "title": "Engaging lesson title (max 50 chars)",
  "duration": "3 min",
  "xp": 35,
  "difficulty": 2,
  "preview": "2-sentence preview: what happened, why it matters to the user personally (max 200 chars)",
  "steps": [
    "Step 1: Context paragraph (2-3 sentences) explaining the core concept behind this news. Include an analogy or comparison to make it click.",
    "Step 2: Deep dive into the key technical or practical insight. Explain HOW it works, not just WHAT it does. Include a specific example.",
    "Step 3: Here is a prompt you can try right now to explore this concept: [actual copy-paste ready prompt]. Explain what this prompt does and what to look for in the output.",
    "Step 4: Practical takeaway — how does this change the way you should use AI tools going forward? What should you start doing differently?"
  ],
  "practiceTask": "A specific, measurable task (not 'explore' or 'try') — e.g., 'Use this technique to solve a real problem you have today'",
  "taskPrompt": "A complete, ready-to-paste prompt (5+ lines) that demonstrates the concept from this lesson, with clear context, instructions, and constraints"
}`;

        const text = await geminiCall(prompt, true);
        const parsed = parseJSON<any>(text);
        const videoSources = await this.findYouTubeVideos(update.title);

        if (parsed && parsed.title) {
            return {
                id: `lesson-${update.id}`,
                title: parsed.title,
                category: update.tag || 'AI',
                duration: parsed.duration || '3 min',
                xp: parsed.xp || 35,
                difficulty: parsed.difficulty || 2,
                preview: parsed.preview || update.shortSummary,
                pill: 'NEW LESSON',
                steps: parsed.steps || [],
                practiceTask: parsed.practiceTask,
                taskPrompt: parsed.taskPrompt,
                sources: videoSources,
            };
        }

        // Improved Fallback logic
        const summary = update.shortSummary || update.title;
        return {
            id: `lesson-${update.id}`,
            title: `Quick Guide: ${update.title}`,
            category: update.tag || 'AI',
            duration: '2 min',
            xp: 25,
            difficulty: 1,
            preview: update.shortSummary,
            pill: 'MICRO-LESSON',
            steps: [
                `This update about ${update.title} highlights a significant shift in the AI landscape.`,
                `To apply this personally, think about how ${update.tag} tools can automate your current repetitive tasks.`,
                `Try searching for "best ${update.tag} workflows 2026" to find specific implementation guides.`
            ],
            practiceTask: `Identify one way the ${update.title} update affects your current workflow.`,
            taskPrompt: `I just read about ${update.title}. Summary: ${summary}\n\nHow can I best utilize ${update.tag} technologies in my professional life?`,
            sources: videoSources,
        };
    }

    // ---- Tool Lesson Generation ----
    async generateToolLesson(tool: ToolData): Promise<LessonData | null> {
        const user = storageService.getUser();
        const lessonId = `tool-lesson-${tool.id}-${user.role.replace(/[^a-zA-Z0-9]/g, '')}`;

        // 1. Check cache first
        const cached = storageService.getCache<LessonData>(lessonId);
        if (cached) return cached;

        const prompt = `You are Delta AI, a premium AI tutor. Generate a hands-on micro-lesson for the tool "${tool.name}" (${tool.description}).
        
The student's role is: "${user.role}".
Their primary goals are: ${(user.goals || []).join(', ')}.
Their AI fluency level is: ${user.aiLevel}.

Tool category: ${tool.category}
Best for: ${(tool.bestFor || []).join(', ')}
Use cases: ${(tool.useCases || []).join(', ')}

CRITICAL RULES — READ CAREFULLY:
1. NEVER say "create an account", "sign up", "visit website", or "explore". The user is already on the tool.
2. Every step must teach a CONCEPT and include a CONCRETE EXAMPLE or PROMPT they can try.
3. Show actual prompts/commands the user can paste. For example: "Try this prompt: 'You are a senior product manager. Analyze this PRD and identify the 3 weakest sections...'"
4. Explain WHY techniques work — "This works because the AI performs better when given a specific role and clear constraints."
5. Steps should build on each other — step 1 teaches a basic technique, step 4 combines techniques for advanced usage.
6. The taskPrompt should be 5+ lines, sophisticated, and demonstrate multiple techniques from the lesson.

Return ONLY valid JSON:
{
  "title": "Master ${tool.name}: [specific skill] (max 50 chars)",
  "duration": "3 min",
  "xp": 50,
  "difficulty": 2,
  "preview": "What the user will actually be able to DO after this lesson — specific skills, not vague promises (max 200 chars)",
  "steps": [
    "Step 1: Core concept + why it matters + example prompt to try",
    "Step 2: Intermediate technique + concrete before/after comparison",
    "Step 3: Advanced technique + trial prompt showing the technique in action",
    "Step 4: Combining everything + power-user workflow tip"
  ],
  "practiceTask": "A specific, measurable task — e.g., 'Rewrite your last email using the role + constraint technique from Step 1'",
  "taskPrompt": "A complete, multi-line prompt demonstrating the techniques from this lesson"
}`;

        const text = await geminiCall(prompt, true);
        const parsed = parseJSON<any>(text);
        const videoSources = await this.findYouTubeVideos(`${tool.name} ai tutorial`);

        if (parsed && parsed.title) {
            return {
                id: `tool-lesson-${tool.id}`,
                title: parsed.title,
                category: tool.category,
                duration: parsed.duration || '3 min',
                xp: parsed.xp || 50,
                difficulty: parsed.difficulty || 2,
                preview: parsed.preview || tool.description,
                pill: 'TOOL GUIDE',
                steps: parsed.steps,
                practiceTask: parsed.practiceTask,
                taskPrompt: parsed.taskPrompt,
                sources: videoSources,
            };
        }

        // Curated fallbacks per tool (NOT generic signup garbage)
        return this.getCuratedToolLesson(tool);
    }

    // Curated fallback lessons per known tool — each teaches real concepts
    private getCuratedToolLesson(tool: ToolData): LessonData {
        const user = storageService.getUser();
        const lessonId = `tool-lesson-${tool.id}-${user.role.replace(/[^a-zA-Z0-9]/g, '')}`;
        const CURATED: Record<string, Partial<LessonData>> = {
            'Claude': {
                title: 'Master Claude: Role + Constraint Prompting',
                preview: 'Learn the two techniques that make Claude produce dramatically better output: role assignment and constraint layering.',
                steps: [
                    'Role prompting is the #1 technique for quality output. Instead of "write me an email", say "You are a senior communications director at a Fortune 500 company. Write a client follow-up email." Why? Claude adjusts its vocabulary, tone, and depth based on the role — a "senior director" produces executive-level writing.',
                    'Constraints prevent the AI from rambling or hallucinating. After your role + instruction, add constraints: "Keep it under 120 words. Use bullet points for action items. Do not mention pricing. End with a specific next step." Each constraint narrows the output toward exactly what you need.',
                    'Try this combined prompt: "You are a senior product manager reviewing a feature spec. Analyze the following idea: [paste your idea]. List exactly 3 strengths, 3 weaknesses, and 1 alternative approach. Keep each point to 1-2 sentences. Do not use marketing language." — Notice how the role + constraints work together.',
                    'Power technique: Chain prompts. After the first response, say "Now rewrite this as if you were explaining it to a non-technical stakeholder. Keep the same insights but simplify the language." This gives you two perfectly tailored versions in seconds.',
                ],
                practiceTask: 'Take the last email or document you wrote and rewrite the prompt that could generate it using Role + Constraint + Chain technique',
                taskPrompt: 'You are a senior product manager at a high-growth tech startup. I need you to analyze this product idea:\n\n[Paste your product idea here]\n\nProvide:\n1. Three specific strengths (why this could work)\n2. Three specific weaknesses (what could go wrong)\n3. One alternative approach that addresses the weaknesses\n4. A recommended next step for validation\n\nKeep each point to 1-2 sentences. Be direct — no marketing fluff. Use data-driven reasoning where possible.',
            },
            'ChatGPT': {
                title: 'ChatGPT Power: Custom Instructions',
                preview: 'Learn how Custom Instructions make ChatGPT remember your preferences across every conversation — no more repeating yourself.',
                steps: [
                    'Custom Instructions are ChatGPT\'s most underused feature. They let you set persistent context that applies to EVERY conversation. Go to Settings → Personalization → Custom Instructions. The first box is "What would you like ChatGPT to know about you?" — enter: your role, industry, communication style, and key tools you use.',
                    'The second box "How would you like ChatGPT to respond?" controls output format. Try: "Be concise and direct. Use bullet points for lists. When I ask for code, include comments explaining WHY, not just WHAT. Default to practical examples over theory. If you\'re uncertain, say so." This transforms every response.',
                    'Try this experiment to see the difference: Ask "Help me write a project update" with and without Custom Instructions. Without: you get a generic template. With "I\'m a software engineering lead reporting to VP of Engineering, my team uses React/TypeScript" set: you get a focused, role-appropriate update with the right technical depth.',
                    'Advanced: Use Custom Instructions to create specialized modes. Example: "When I start a message with /review, act as a code reviewer. When I start with /write, act as a technical writer. When I start with /debug, act as a senior debugging specialist." This gives you 3 AI assistants in one.',
                ],
                practiceTask: 'Set up your Custom Instructions right now: fill both boxes with specific details about your role and preferred response format, then test with 3 different prompts to see the difference',
                taskPrompt: 'I want to set up my ChatGPT Custom Instructions. Help me fill in both boxes based on this info about me:\n\nRole: [Your role]\nIndustry: [Your industry]\nKey tools I use: [List your tools]\nMy biggest frustration with AI responses: [What annoys you]\nMy preferred style: [Formal/casual/technical]\n\nGenerate optimized text for both boxes:\n1. "What would you like ChatGPT to know about you?" (150 words max)\n2. "How would you like ChatGPT to respond?" (100 words max)\n\nMake them specific enough to dramatically improve output quality but general enough to work across all conversations.',
            },
            'Cursor': {
                title: 'Cursor: The .cursorrules Power Move',
                preview: 'Learn how a single file in your project root makes Cursor write code in YOUR style, follow YOUR patterns, and understand YOUR codebase.',
                steps: [
                    'The .cursorrules file is a plain text file in your project root that Cursor reads before every interaction. It\'s like Custom Instructions but for code. The key insight: Cursor generates dramatically better code when it knows your conventions. Example: "We use TypeScript strict mode. All functions must have explicit return types. Use early returns over nested if-else. Error handling uses Result<T, E> pattern, never try-catch."',
                    'Structure your .cursorrules in sections. Start with "## Tech Stack" (list frameworks and versions), then "## Code Style" (naming conventions, patterns to follow/avoid), then "## Project Context" (what the app does, key architectural decisions). Example: "## Avoid: class components, any type, console.log in production code, relative imports deeper than 2 levels."',
                    'The @-mention system is crucial for context. Use @file to reference a specific file ("make this component follow the same pattern as @components/Button.tsx"), @folder for bulk context ("@services/ — add a new service following this pattern"), and @codebase for project-wide questions. The more context you give, the better the output.',
                    'Pro workflow: Cmd+L (chat) for explaining/planning, Cmd+K (inline) for editing existing code, Cmd+Shift+I (agent) for multi-file tasks. Agent mode is powerful but unpredictable — always review its changes. Best use: "Refactor all API calls in @services/ to use the new error handling pattern from @utils/result.ts".',
                ],
                practiceTask: 'Create a .cursorrules file for your current project with at least 3 sections: Tech Stack, Code Style, and Avoid list',
                taskPrompt: '# .cursorrules for [Your Project Name]\n\n## Tech Stack\n- [Framework] v[version]\n- [Language] with [config]\n- [Package manager]\n\n## Code Style\n- Use [naming convention] for variables and functions\n- All components must be functional with typed props\n- Prefer [pattern] over [anti-pattern]\n- Maximum function length: 30 lines\n\n## Architecture\n- [Describe your folder structure]\n- Services handle all external API calls\n- Components are pure UI, no business logic\n\n## Avoid\n- any type — always use explicit types\n- console.log in production code\n- Nested ternaries deeper than 2 levels\n- Direct DOM manipulation',
            },
            'Perplexity': {
                title: 'Perplexity: Research Like a Pro',
                preview: 'Learn how to use Perplexity\'s Focus modes and follow-up chains to do in 5 minutes what used to take 2 hours of Google searching.',
                steps: [
                    'Perplexity\'s killer feature vs ChatGPT: real-time web search with citations. But most people use it like Google — one question, read the answer, done. The power is in Focus modes: "Academic" searches only peer-reviewed papers, "Writing" is creative, "Math" solves step-by-step, and "Video" searches YouTube. Switch modes based on what you need.',
                    'The follow-up chain is where real research happens. Don\'t ask one question — ask 4-5 in sequence. Start broad: "What are the latest advances in AI code generation?" Then narrow: "How does Cursor\'s approach differ from GitHub Copilot technically?" Then apply: "Based on these differences, which is better for TypeScript React projects?" Each follow-up inherits context from all previous answers.',
                    'Try this research chain right now: (1) "What are the top 3 AI developments this week?" → (2) Pick the most interesting one and ask "Explain the technical details of [development] in simple terms" → (3) "How can I practically use this in my work as a [your role]?" → (4) "Generate a step-by-step guide for implementing this." You\'ll get a comprehensive, cited research brief in under 3 minutes.',
                    'Pro tip: Use the Collections feature to save and organize research threads. Create collections by project or topic. Then you can reference past research in new threads: "Based on my previous research about [topic], how does this new development change things?" This builds a personal knowledge base over time.',
                ],
                practiceTask: 'Run a 4-question research chain on a topic relevant to your current work and save it to a Collection',
                taskPrompt: 'I need to research [YOUR TOPIC] thoroughly. Help me create a 5-question research chain that goes from broad to specific:\n\n1. Start with the current state of the field\n2. Narrow to the most important recent development\n3. Understand the technical details\n4. Apply it to my specific role ([YOUR ROLE])\n5. Create an action plan\n\nFor each question, explain why that question follows logically from the previous one. Format the questions so I can paste them directly into Perplexity\'s search.',
            },
            'Midjourney': {
                title: 'Midjourney: Prompt Architecture',
                preview: 'Learn the exact prompt structure that professionals use: Subject + Environment + Style + Parameters. Includes 3 ready-to-use prompts.',
                steps: [
                    'Midjourney prompts follow a hierarchy: Subject > Environment > Style > Mood > Technical. Each layer adds precision. Bad prompt: "a cat." Good prompt: "a Persian cat sitting on a velvet armchair, in a dimly lit Victorian library, oil painting style, warm amber tones, cinematic lighting, shallow depth of field." The AI can\'t read your mind — every detail you omit, it invents randomly.',
                    'Parameters control quality and style beyond the prompt text. The essential ones: --ar 16:9 (aspect ratio for widescreen), --v 6.1 (latest model version), --s 250 (stylize — higher = more artistic), --q 2 (quality — higher = more detail, slower). Try this: "a futuristic Tokyo street at night, cyberpunk neon, rain reflections on pavement, cinematic --ar 21:9 --v 6.1 --s 400" — the parameters make the difference between amateur and professional output.',
                    'The "style reference" feature (--sref) is a game-changer. Upload or link an image whose STYLE you want to copy, and Midjourney applies that aesthetic to your prompt. Example: --sref [paste image URL] copies the color palette, lighting, and artistic feel. Combine with --sw (style weight, 0-1000) to control how much influence the reference image has. At --sw 100 it\'s subtle, at --sw 800 it\'s dominant.',
                    'Pro workflow for consistent brand imagery: (1) Generate one hero image you love. (2) Use --sref with that image + --sw 500 for all subsequent generations. (3) Use --cref (character reference) to keep faces/characters consistent across images. This is how people create entire visual campaigns with a unified look.',
                ],
                practiceTask: 'Generate 3 images using the Subject+Environment+Style+Parameters structure, then use --sref with your best result to create 2 variations in the same visual style',
                taskPrompt: 'a thoughtful portrait of a creative entrepreneur in a modern co-working space, natural window light casting soft shadows, editorial photography style, warm earth tones with accent teal, shot on medium format film, shallow depth of field, magazine quality --ar 3:4 --v 6.1 --s 300 --q 2',
            },
            'Gemini': {
                title: 'Gemini: Leverage the 1M Context',
                preview: 'Gemini\'s 1M+ token context window changes everything. Learn to feed it entire documents, codebases, and conversations for analysis no other AI can do.',
                steps: [
                    'Gemini\'s secret weapon is its enormous context window — 1M+ tokens, roughly 700,000 words. That\'s an entire book, an entire codebase, or months of emails in a single conversation. The strategy: instead of summarizing your data and asking about the summary, paste the ENTIRE source material and ask specific questions. The results are dramatically more accurate.',
                    'Document analysis use case: Upload a 50-page PDF (or paste its text). Then ask layered questions: "What are the 3 key arguments in this document?" → "Where does the author contradict themselves?" → "Rewrite section 3 to address the weakness you identified." Gemini can cross-reference between different sections because it has it ALL in context simultaneously.',
                    'Try this with your own work: Paste an entire project document, report, or codebase into Gemini and ask: "You have my complete [document type]. Analyze it for: (1) logical consistency, (2) missing information, (3) areas that need more evidence, (4) suggested improvements. Quote specific sections when making each point." — The specificity of "quote specific sections" forces precise, traceable analysis.',
                    'Code review power move: Paste your entire codebase (or key files). Ask: "Given the full codebase context, identify: (1) potential bugs that might not be caught by linting, (2) architectural patterns that are inconsistent across files, (3) performance bottlenecks." Because Gemini sees ALL files simultaneously, it catches cross-file issues that Cursor or ChatGPT miss when working file-by-file.',
                ],
                practiceTask: 'Take your longest document or largest code file and paste the ENTIRE thing into Gemini, then run the 4-point analysis from Step 3',
                taskPrompt: 'You have access to my complete [document/codebase]. I need a thorough analysis.\n\nPlease evaluate:\n1. LOGICAL CONSISTENCY — Are there any contradictions, circular arguments, or assumptions that aren\'t supported? Quote the specific sections.\n2. COMPLETENESS — What important information is missing? What questions does a reader/user have that aren\'t answered?\n3. QUALITY ISSUES — What sections are weakest? What needs more evidence, examples, or detail?\n4. IMPROVEMENTS — For each issue you found, suggest a specific fix. Don\'t just identify problems — propose solutions.\n\nFormat your response with clear headers and quote the original text when referencing specific sections.',
            },
        };

        const curated = CURATED[tool.name];
        if (curated) {
            return {
                id: `tool-lesson-${tool.id}`,
                category: tool.category,
                duration: '3 min',
                xp: 50,
                difficulty: 2,
                pill: 'TOOL GUIDE',
                title: curated.title || `Master ${tool.name}`,
                preview: curated.preview || tool.description,
                steps: curated.steps || [],
                practiceTask: curated.practiceTask,
                taskPrompt: curated.taskPrompt,
            };
        }

        // Generic but still educational fallback for tools without curated content
        return {
            id: `tool-lesson-${tool.id}`,
            title: `${tool.name}: Practical Techniques`,
            category: tool.category,
            duration: '3 min',
            xp: 50,
            difficulty: 2,
            preview: `${tool.deltaAnalysis || tool.description} — learn the techniques that separate power users from beginners.`,
            pill: 'TOOL GUIDE',
            steps: [
                `${tool.name} (${tool.description}) is designed for ${(tool.bestFor || ['professionals']).join(', ')}. What makes it different from alternatives: ${tool.deltaAnalysis || 'it excels in its specific niche'}. Understanding this positioning helps you know WHEN to reach for this tool vs. others.`,
                `The core workflow: ${(tool.useCases || ['general tasks']).slice(0, 2).join(' and ')}. The key to getting good results from any AI tool is specificity. Instead of vague requests, structure your input as: Context (who you are, what you're working on) → Task (specific deliverable) → Constraints (format, length, tone, what to avoid).`,
                `Try this prompt to test ${tool.name}'s strengths: "I'm a ${(tool.bestFor || ['professional'])[0].toLowerCase()} working on ${(tool.useCases || ['a project'])[0].toLowerCase()}. I need you to: [describe your specific task]. Format the output as [bullets/paragraphs/table]. Keep it under [word count]. Focus on [what matters most]." — Adapt this template for your actual work.`,
                `Power user tip: Most people use AI tools for one-shot questions. The real value is in follow-up chains. After getting your first response, ask "How could this be improved?" or "Now apply the same approach to [different context]." Each follow-up builds on context, producing increasingly refined and useful output.`,
            ],
            practiceTask: `Use the structured prompt template from Step 3 to complete one real task you have today with ${tool.name}`,
            taskPrompt: `Context: I'm a [YOUR ROLE] working on [YOUR PROJECT/TASK].\n\nTask: I need help with [SPECIFIC DELIVERABLE — be as precise as possible].\n\nRequirements:\n- Format: [bullets / paragraphs / table / code]\n- Length: [word count or page count]\n- Tone: [formal / conversational / technical]\n- Focus on: [most important aspects]\n- Avoid: [anything you don't want included]\n\nAdditional context: [paste any relevant background information, examples of what you've done before, or reference material]`,
        };
    }

    // ---- Dynamic Topic Lesson Generation ----
    async generateDynamicLesson(topic: string, category: string): Promise<LessonData | null> {
        const user = storageService.getUser();
        const lessonId = `dynamic-lesson-${topic.replace(/\\s+/g, '-').toLowerCase()}-${user.role.replace(/[^a-zA-Z0-9]/g, '')}`;

        // Check cache first
        const cached = storageService.getCache<LessonData>(lessonId);
        if (cached) return cached;

        const prompt = `You are Delta AI, a premium AI tutor. Generate a highly practical micro-lesson about "${topic}".
        
The student's role is: "${user.role}".
Their primary goals are: ${(user.goals || []).join(', ')}.
Their AI fluency level is: ${user.aiLevel}.

CRITICAL RULES:
1. NEVER say "create an account", "sign up", or "visit website". Focus purely on the skills and concepts.
2. Every step must teach a CONCEPT and include a CONCRETE EXAMPLE or PROMPT they can try immediately.
3. Tailor the use cases uniquely for a "${user.role}". If they are a Founder, talk about strategy or growth. If they are a Creator, talk about content.
4. Provide an actionable taskPrompt that is copy-paste ready.

Return ONLY valid JSON exactly matching this structure:
{
  "title": "Topic title (max 50 chars)",
  "duration": "3 min",
  "xp": 40,
  "difficulty": 2,
  "preview": "What the user will actually be able to DO after this lesson (max 200 chars)",
  "steps": [
    "Step 1: Core concept + why it matters + example prompt to try",
    "Step 2: Intermediate technique + concrete before/after comparison",
    "Step 3: Advanced technique + trial prompt showing the technique in action",
    "Step 4: Combining everything + power-user workflow tip"
  ],
  "practiceTask": "A specific, measurable task",
  "taskPrompt": "A complete, multi-line prompt demonstrating the techniques from this lesson"
}`;

        const text = await geminiCall(prompt, true);
        const parsed = parseJSON<any>(text);
        const videoSources = await this.findYouTubeVideos(`${topic} ai tutorial`);

        if (parsed && parsed.title) {
            const finalLesson: LessonData = {
                id: lessonId,
                title: parsed.title,
                category: category,
                duration: parsed.duration || '3 min',
                xp: parsed.xp || 40,
                difficulty: parsed.difficulty || 2,
                preview: parsed.preview || `Learn how to leverage ${topic} for your workflow.`,
                pill: 'NEW LESSON',
                steps: parsed.steps || [],
                practiceTask: parsed.practiceTask,
                taskPrompt: parsed.taskPrompt,
                sources: videoSources,
            };
            storageService.setCache(lessonId, finalLesson);
            return finalLesson;
        }

        // Category-specific fallbacks
        const categoryFallbacks: Record<string, string[]> = {
            'AI Writing': [
                "Start by defining your target audience and tone clearly.",
                "Use 'Seed Prompts' to give the AI a few examples of your style.",
                "Always review and edit for personal voice and factual accuracy."
            ],
            'Career & Biz': [
                "Audit your weekly tasks to find 3 repetitive items suitable for AI.",
                "Use tools like ChatGPT or Claude to draft initial responses or reports.",
                "Schedule a 30-minute 'AI Experimentation' block in your calendar weekly."
            ],
            'AI Images': [
                "Master the Subject + Environment + Style + Parameters structure.",
                "Use style references (--sref) to maintain visual consistency.",
                "Experiment with technical parameters like aspect ratio (--ar) and stylize (--s)."
            ]
        };

        return {
            id: `fallback-${Date.now()}`,
            title: `Guide: ${topic}`,
            category: category,
            duration: '3 min',
            xp: 30,
            difficulty: 2,
            preview: `Essential tips and workflows for ${topic}.`,
            pill: 'QUICK LESSON',
            steps: categoryFallbacks[category] || [
                `Understand the core principles of ${topic} to maximize efficiency.`,
                `Leverage specialized AI tools that cater to the specific needs of ${category}.`,
                `Practice consistently to stay ahead in your AI learning journey.`
            ],
            practiceTask: `Complete one small project using a technique from this ${topic} guide.`,
            taskPrompt: `I want to learn more about ${topic} in the context of ${category}. Give me a step-by-step beginner's tutorial.`,
            sources: videoSources,
        };
    }

    // ---- Learning Path Generation ----
    async generateLearningPath(category: string): Promise<string[]> {
        const prompt = `Generate 5 micro-lesson titles for the "${category}" learning path in an AI education app.
Each title should be actionable and beginner-friendly. Return ONLY a JSON array of strings: ["title1", "title2", ...]`;

        const text = await geminiCall(prompt, true);
        const parsed = parseJSON<string[]>(text);
        return parsed || ['Getting Started', 'Core Concepts', 'Practical Application', 'Advanced Tips', 'Mastery Project'];
    }

    // ---- Chat (Gemini-powered with context) ----
    initChat(): void {
        const user = storageService.getUser();
        const recentUpdates = storageService.getCache<VerifiedUpdate[]>('delta_pipeline_updates', 1000 * 60 * 60) || [];

        let newsContext = "";
        if (recentUpdates.length > 0) {
            newsContext = "\n\nLATEST AI NEWS (RAG CONTEXT):\n" + recentUpdates.slice(0, 15).map((u: VerifiedUpdate) => `- [${u.tag}] ${u.title}: ${u.shortSummary}`).join('\n');
        }

        let toolsContext = "\n\nDELTA APP CURATED TOOLS:\n" + CURATED_TOOLS.map(t => `- ${t.name} (${t.category}): ${t.description}`).join('\n');

        this.chatHistory = [
            {
                role: 'user',
                parts: [{
                    text: `You are Delta AI, a friendly and knowledgeable AI learning assistant inside the Delta app. The user's name is ${user.name}, they are a ${user.role}. Their goals are: ${user.goals.join(', ')}. Their AI level is: ${user.aiLevel}.

Your personality:
- Warm and direct — use their name, use emoji occasionally
- Give concrete recommendations, never vague advice
- When they ask about tools, always recommend specific ones from your knowledge below
- Never say "As an AI..." — just be helpful
- Keep responses concise (max 3 paragraphs)
- Suggest tools by saying their name. If you mention Claude, ChatGPT, Cursor, Perplexity, or Midjourney, the app will show a lesson card for it.

${newsContext}
${toolsContext}

Respond with exactly this greeting to start the conversation: "Hey ${user.name}! 👋 I'm Delta, your AI learning companion. Ask me anything about AI tools, the latest news, or what to learn next!"`,
                }],
            },
            {
                role: 'model',
                parts: [{
                    text: `Hey ${user.name}! 👋 I'm Delta, your AI learning companion. Ask me anything about AI tools, the latest news, or what to learn next!`,
                }],
            },
        ];
    }

    async sendChatMessage(message: string, context?: VerifiedUpdate[]): Promise<string> {
        if (!this.chatHistory.length) {
            this.initChat();
        }

        // If context is provided (e.g. user just saw an update), inject it into the message parts
        const prompt = context && context.length > 0
            ? `USER MESSAGE: ${message}\n\nSTRICT CONTEXT FOR THIS REPLY:\n${JSON.stringify(context.map(u => ({ title: u.title, summary: u.shortSummary })))}`
            : message;

        this.chatHistory.push({ role: 'user', parts: [{ text: prompt }] });

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: this.chatHistory,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 800,
                    },
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error('[Chat] API Error:', response.status, errData);
                return "I'm having trouble connecting to my brain right now. Please try again in a moment.";
            }

            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response. Try asking something else!";

            this.chatHistory.push({ role: 'model', parts: [{ text }] });

            // Keep history manageable
            if (this.chatHistory.length > 20) {
                this.chatHistory = [this.chatHistory[0], this.chatHistory[1], ...this.chatHistory.slice(-10)];
            }

            return text;
        } catch (e) {
            console.error('[Chat] Failed:', e);
            return "Connection error. Please check your internet or try again later.";
        }
    }
}

export const deltaService = new DeltaService();
