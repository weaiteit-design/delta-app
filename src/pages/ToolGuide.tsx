import React, { useState } from 'react';
import { ToolData, LessonData } from '../shared/types/types';
import { deltaService } from '../shared/api/deltaService';
import { ArrowLeft, BookOpen, Award, Target, Zap, ChevronRight } from 'lucide-react';

// ============================================
// TOOL GUIDE — Comprehensive guide per tool
// ============================================

interface ToolGuideProps {
    tool: ToolData;
    onBack: () => void;
    onStartLesson: (lesson: LessonData) => void;
}

// Curated guide data for top tools
const TOOL_GUIDES: Record<string, {
    overview: string;
    whoItsFor: string[];
    verdict: { rating: 'Yes' | 'No' | 'Depends'; summary: string; vsGPT: string };
    masteryLessons: { level: string; title: string; preview: string; steps: string[]; practiceTask: string }[];
}> = {
    'Claude': {
        overview: 'Claude by Anthropic is the AI assistant that excels at nuanced writing, careful analysis, and following complex instructions. Where ChatGPT tends toward broad, safe answers, Claude shines when you need depth, structured reasoning, and the ability to handle long, detailed prompts without losing context.',
        whoItsFor: ['Writers who need quality prose, not just speed', 'Analysts processing long documents', 'Developers who want careful code review', 'Anyone who values accuracy over confidence'],
        verdict: { rating: 'Yes', summary: 'Best-in-class for writing and analysis. If you write professionally, this is your tool.', vsGPT: 'Claude writes more naturally and follows complex instructions better. ChatGPT is faster and has more integrations.' },
        masteryLessons: [
            {
                level: 'Beginner', title: 'Your First Claude Conversation',
                preview: 'Learn role prompting, constraints, and how to get Claude to stop being generic.',
                steps: [
                    'The #1 mistake with Claude: being vague. "Write me an email" produces garbage. Instead: "You are a senior product lead. Write a stakeholder update email about a 2-week delay in the mobile app launch. Tone: transparent but confident. Length: 150 words max. Include: what happened, impact, mitigation plan." — every constraint narrows the output toward usable.',
                    'Claude\'s secret weapon: it actually reads your constraints. Try adding "Do not use buzzwords" or "Write at an 8th-grade reading level" — Claude follows these reliably. ChatGPT tends to ignore them after the first paragraph.',
                    'Try this prompt: "You are a senior editor at The Atlantic. Review the following paragraph and give me exactly 3 specific improvements, not generic advice: [paste your text]." Notice how the role + specificity produces genuinely useful feedback.',
                    'The chain technique: after Claude\'s first response, say "Good. Now rewrite this as a 280-character tweet thread capturing the key insights." This gives you two perfectly tailored versions from one thinking session.',
                ],
                practiceTask: 'Take something you wrote this week and get Claude to improve it using role + constraint + chain technique',
            },
            {
                level: 'Intermediate', title: 'Document Analysis & Long Context',
                preview: 'Use Claude\'s 200K context window to analyze entire documents, compare texts, and extract structured data.',
                steps: [
                    'Claude can process up to 200K tokens — that\'s roughly a 500-page book. This means you can paste entire contracts, research papers, or codebases and ask detailed questions. The key technique: give Claude the full context FIRST, then ask specific questions. Don\'t summarize for it — let it read everything.',
                    'Structured extraction: "Read the attached document and create a table with columns: Section, Key Claim, Evidence Strength (Strong/Medium/Weak), My Take. Cover every major section." This turns a 30-page report into an actionable 1-page briefing.',
                    'Comparison analysis: Paste two documents and prompt "Compare these two documents. For each topic they both cover, show: (1) where they agree, (2) where they disagree, (3) which one provides better evidence. Format as a structured comparison table." This is insanely useful for research and competitive analysis.',
                    'The artifacts feature: ask Claude to create interactive artifacts like working code, data visualizations, or structured documents. Prompt: "Create an artifact that [your need]" — Claude will build it in a sandboxed environment you can interact with.',
                ],
                practiceTask: 'Paste a long document (report, paper, or article) into Claude and extract a structured analysis table',
            },
            {
                level: 'Advanced', title: 'System Prompts & Custom Workflows',
                preview: 'Build sophisticated Claude workflows with system prompts, multi-turn chains, and project-based organization.',
                steps: [
                    'System prompts in Claude Projects are the power-user move. Create a Project, set the system prompt: "You are a senior [role] at [company]. You know these facts: [key context]. Your communication style: [describe]. When asked to write, default to [format]. Never [restrictions]." Now every conversation in that project inherits this context.',
                    'Multi-document projects: Add key documents to a Claude Project as context. Contracts, style guides, product specs — Claude references them without you re-pasting. Example: add your company\'s style guide, then every writing request automatically follows your brand voice.',
                    'The chain-of-thought override: When Claude gives a surface-level answer, prompt "Think about this step by step. Start with your assumptions, then work through the logic, then give me your conclusion with confidence level (high/medium/low)." This dramatically improves accuracy on complex questions.',
                    'Advanced workflow: Use Claude for the full writing pipeline. Step 1: brainstorm angles (Claude as creative director). Step 2: outline structure (Claude as editor). Step 3: draft each section (Claude as writer). Step 4: review and polish (Claude as copy editor). Each step uses a different role for different output quality.',
                ],
                practiceTask: 'Create a Claude Project with a system prompt tailored to your work and test it with 3 different prompts',
            },
        ],
    },
    'ChatGPT': {
        overview: 'ChatGPT by OpenAI is the Swiss Army knife of AI — the most versatile, most integrated, and most widely-used AI assistant. It excels at conversational interaction, has the best plugin ecosystem (GPTs, Code Interpreter, DALL-E, browsing), and is the default choice when you\'re not sure which tool to use.',
        whoItsFor: ['Anyone who wants one tool that does everything reasonably well', 'Power users who leverage Custom GPTs and plugins', 'Teams that need shared workflows', 'People who value speed and breadth over depth'],
        verdict: { rating: 'Yes', summary: 'The universal default. Not always the best at any one thing, but consistently good at everything.', vsGPT: 'This IS ChatGPT. Claude is better for writing, Perplexity for research, Cursor for code. ChatGPT wins on versatility and integrations.' },
        masteryLessons: [
            {
                level: 'Beginner', title: 'Custom Instructions That Transform Output',
                preview: 'Set up Custom Instructions so every ChatGPT conversation starts with your context — no more repeating yourself.',
                steps: [
                    'Custom Instructions are ChatGPT\'s most underused feature. Go to Settings → Personalization → Custom Instructions. Box 1 ("What would you like ChatGPT to know about you?"): Enter your role, industry, communication style, and key tools. Example: "I\'m a product manager at a B2B SaaS company. I manage a team of 8 engineers. I use Linear for project management and Figma for design."',
                    'Box 2 ("How would you like ChatGPT to respond?"): This controls output format globally. Try: "Be concise and direct. Use bullet points for lists. When I ask for code, include comments explaining WHY, not just WHAT. Default to practical examples over theory. If uncertain, say so and explain your confidence level." This transforms every single response.',
                    'The "mode switch" technique: In Box 2, add: "When I start a message with /review, act as a code reviewer. When I start with /write, act as a technical writer. When I start with /brainstorm, act as a creative strategist." Now you have 3 specialists in one conversation.',
                    'Test the difference: Ask "Help me write a project update" with and without Custom Instructions. Without: generic template. With: a focused, role-appropriate update with the right technical depth and format. The quality gap is massive.',
                ],
                practiceTask: 'Set up your Custom Instructions with both boxes filled, then test with 3 very different prompts to see the consistency',
            },
            {
                level: 'Intermediate', title: 'Code Interpreter & Data Analysis',
                preview: 'Upload files, run Python, create charts, analyze data — all inside ChatGPT. No coding required.',
                steps: [
                    'Code Interpreter (Advanced Data Analysis) lets ChatGPT run actual Python code. Upload a CSV, Excel file, or PDF and say "Analyze this data. Show me: (1) summary statistics, (2) the most interesting patterns, (3) 3 visualizations that reveal key insights. Save the charts as downloadable images." — It writes and runs the code for you.',
                    'The comparison technique: Upload two datasets and prompt "Compare these two datasets. Identify: (1) where they overlap, (2) significant differences, (3) trends that only appear when you look at both together. Create a side-by-side visualization." This is incredibly powerful for business analysis.',
                    'File transformation: "Convert this PDF into a clean, structured spreadsheet with columns: [specify]. Clean up any formatting issues. Handle missing data by [rule]." ChatGPT can parse messy documents into perfectly structured data.',
                    'Iterative analysis: After the first analysis, follow up with "Now dig deeper into finding #2. Run a correlation analysis and test if this pattern is statistically significant. Show me the p-values and confidence intervals." — You\'re doing data science without writing a line of code.',
                ],
                practiceTask: 'Upload a real spreadsheet or dataset and ask ChatGPT to find 3 insights you didn\'t know about',
            },
            {
                level: 'Advanced', title: 'Custom GPTs & Workflow Automation',
                preview: 'Build your own Custom GPTs — specialized AI assistants for specific tasks that anyone on your team can use.',
                steps: [
                    'Custom GPTs are your personal AI team. Go to Explore → Create a GPT. Define its role, personality, and capabilities. Upload knowledge files it should reference. Example: A "Meeting Notes Processor" GPT that takes raw meeting notes and outputs action items, decisions, and follow-up owners in your company\'s specific format.',
                    'The knowledge upload strategy: Upload your company\'s style guide, product documentation, SOPs, or any reference material. The GPT references this automatically. This is how you build a GPT that actually knows your business — not a generic assistant but a specialized expert.',
                    'Advanced: Connect your GPT to external APIs using Actions. Your GPT can pull data from your CRM, post to Slack, update spreadsheets, or query databases. Example: A "Sales Intelligence" GPT that pulls prospect data from your CRM and generates personalized outreach emails.',
                    'Team workflow: Share GPTs with your team via link. Build a suite: one GPT for customer support responses, one for writing internal docs, one for analyzing customer feedback. Each team member gets a specialized AI co-worker that follows your exact processes.',
                ],
                practiceTask: 'Create a Custom GPT for one specific task you do repeatedly, upload at least one reference document, and test it with 3 real scenarios',
            },
        ],
    },
    'Cursor': {
        overview: 'Cursor is the AI-first code editor built on VS Code. It\'s not just autocomplete — it understands your entire codebase, generates multi-file edits, and lets you chat with your code. If you write code daily, Cursor is likely the highest-ROI AI tool you can adopt.',
        whoItsFor: ['Software developers at any level', 'Anyone who writes code as part of their job', 'Teams wanting to accelerate development velocity', 'Students learning to code'],
        verdict: { rating: 'Yes', summary: 'If you write code, this pays for itself in the first week. The codebase-aware editing is unmatched.', vsGPT: 'Cursor understands your entire project. ChatGPT only knows what you paste. For code, there\'s no comparison.' },
        masteryLessons: [
            {
                level: 'Beginner', title: 'Tab Completion & Inline Chat',
                preview: 'Master the two features you\'ll use 100 times a day: smart tab completion and Cmd+K inline editing.',
                steps: [
                    'Tab completion in Cursor is not like traditional autocomplete — it predicts MULTI-LINE blocks based on the context of your entire file. Start typing a function and let it suggest. Accept with Tab. The key: write a clear comment first, then let Cursor generate the implementation. Comment-driven development is dramatically faster.',
                    'Cmd+K (inline editing): Select code, press Cmd+K, type "refactor this to use async/await" or "add error handling" or "optimize this for performance." Cursor edits the selected code in-place. This is faster than switching to a chat panel — you stay in flow.',
                    'The context trick: Open related files in your editor before using Cmd+K. Cursor reads your open tabs for context. If you\'re editing a controller, have the model and service files open — Cursor will use the correct types and patterns automatically.',
                    'Try this: Open a file with a function that has no error handling. Select it, press Cmd+K, type "Add comprehensive error handling with specific error types and meaningful error messages." Watch Cursor rewrite it with proper try/catch blocks, custom error classes, and descriptive messages.',
                ],
                practiceTask: 'Use Cmd+K to refactor one real function in your current project — add error handling, improve naming, or optimize performance',
            },
            {
                level: 'Intermediate', title: '.cursorrules & Project Context',
                preview: 'Configure Cursor to understand your project\'s conventions with .cursorrules and @-mention context.',
                steps: [
                    'The .cursorrules file is Cursor\'s secret weapon. Create it in your project root. It tells Cursor your project\'s conventions: "Use TypeScript strict mode. Prefer functional components with hooks. Name files with PascalCase for components, camelCase for utilities. Use Tailwind for styling. Always add JSDoc comments to exported functions."',
                    'The @ context system: In Cursor\'s chat, use @file to reference specific files, @folder for directories, @web for web search results, @docs for documentation. Example: "@models/User.ts Create a new API endpoint following the same pattern as @controllers/auth.ts" — Cursor cross-references both files.',
                    'Multi-file generation: In the chat panel (Cmd+L), describe what you want and reference existing patterns. "Create a new CRUD module for Products following the same architecture as @folder(src/modules/orders). Include: model, controller, service, routes, and tests." Cursor generates all files that match your existing patterns.',
                    'Advanced .cursorrules: Add sections for your AI coding preferences: "When generating tests, use Jest with describe/it blocks. Mock external services. Test edge cases including: empty arrays, null values, and error responses. Add a comment explaining what each test validates."',
                ],
                practiceTask: 'Create a .cursorrules file for your current project with at least 10 specific rules about your coding conventions',
            },
            {
                level: 'Advanced', title: 'Codebase Chat & Multi-File Refactoring',
                preview: 'Use Cursor\'s full codebase understanding to refactor across files, analyze architecture, and catch bugs.',
                steps: [
                    'Codebase-wide chat (Cmd+L with @codebase): "Explain the authentication flow in this project — trace it from the login endpoint through middleware to the database query." Cursor reads your entire codebase and maps the flow. This is invaluable for onboarding onto new projects.',
                    'Multi-file refactoring: "Rename the User model to Account everywhere in the codebase — update the model, all controllers, services, routes, and test files. Show me all files that need to change." Cursor generates a coordinated set of edits across your entire project.',
                    'Architecture review: "@codebase Analyze this project\'s architecture. Identify: (1) potential security vulnerabilities, (2) N+1 query patterns, (3) functions that should be async but aren\'t, (4) dead code that can be safely removed. For each issue, show the file and line number."',
                    'The compose feature: Use Cursor Composer (Cmd+I) for complex multi-file operations. Describe the full scope: "Add pagination to all list endpoints. Update the service layer to accept page/limit params, update controllers to parse query params, update the frontend API client, and add pagination UI components." Cursor plans and executes the entire refactor.',
                ],
                practiceTask: 'Ask Cursor to analyze your current project\'s architecture and identify 3 real improvements, then implement one of them',
            },
        ],
    },
    'Perplexity': {
        overview: 'Perplexity is the AI-powered research engine that replaces traditional search. Every answer includes citations with real sources. It doesn\'t guess — it searches, synthesizes, and shows its work. If Google gives you links, Perplexity gives you answers.',
        whoItsFor: ['Researchers and analysts who need sourced answers', 'Students writing papers', 'Professionals who need to quickly understand new domains', 'Anyone tired of clicking through 10 Google results'],
        verdict: { rating: 'Yes', summary: 'The best research tool available. Use it when accuracy and sources matter more than creative output.', vsGPT: 'Perplexity always cites real sources — ChatGPT makes things up. For research, fact-checking, and learning new domains, Perplexity is strictly better.' },
        masteryLessons: [
            {
                level: 'Beginner', title: 'Focus Modes & Source Selection',
                preview: 'Learn which Focus mode to use for different research tasks — YouTube, Academic, Reddit, or All.',
                steps: [
                    'Focus modes change WHERE Perplexity searches. "All" is default — internet-wide. "Academic" searches only peer-reviewed papers and Google Scholar. "YouTube" searches video transcripts. "Reddit" searches discussions and opinions. "Writing" generates without searching (like ChatGPT). Choosing the right focus mode is the #1 skill.',
                    'When to use each: Fact checking → All + follow-up "Show me 3 conflicting sources on this." Professional research → Academic. What real users think → Reddit. How to do something → YouTube. Creative writing → Writing mode.',
                    'The follow-up chain: Perplexity excels at multi-turn research. Start broad: "What is retrieval-augmented generation?" Then narrow: "Which companies are using RAG in production?" Then specific: "Compare Pinecone vs Weaviate for RAG — recent benchmarks only, 2025-2026." Each follow-up builds on the previous context.',
                    'Collections: Save related searches into Collections. Build a research dossier on any topic. Example: Create a "Competitive Analysis" collection and add searches about each competitor. Perplexity remembers the full context of the collection.',
                ],
                practiceTask: 'Research a topic you\'re curious about using 3 different Focus modes and compare the kinds of answers you get',
            },
            {
                level: 'Intermediate', title: 'Deep Research & Synthesis',
                preview: 'Use Perplexity Pro\'s Deep Research for comprehensive reports and multi-source synthesis.',
                steps: [
                    'Pro Search (the toggle in Perplexity Pro): Runs multiple searches, analyzes results, and synthesizes a comprehensive answer. Use for complex questions: "Compare all major cloud GPU providers for training LLMs — pricing, availability, performance. Include data from the last 3 months only."',
                    'The synthesis technique: Ask Perplexity to combine information from multiple angles. "Research [topic] from three perspectives: (1) what the scientific literature says, (2) what practitioners report on forums, (3) what companies are actually doing. Flag where these three narratives disagree."',
                    'Source quality control: "Find the 5 most authoritative sources on [topic]. For each source, assess the credibility (author expertise, publication reputation, recency) and summarize the key claim. Rank them by reliability." This gives you a curated reading list, not just a dump of links.',
                    'The "what changed recently" technique: "What has changed about [topic] in the last 30 days? Focus on: new research, product launches, policy changes, and market shifts. Cite specific dates and sources." This keeps you current faster than any newsletter.',
                ],
                practiceTask: 'Use Pro Search to generate a comprehensive research brief on one topic relevant to your work',
            },
            {
                level: 'Advanced', title: 'API Integration & Automated Research',
                preview: 'Use Perplexity\'s API to build automated research pipelines and custom knowledge systems.',
                steps: [
                    'Perplexity has an API that\'s surprisingly affordable. Use it to build automated research pipelines: every morning, query "What are the most important developments in [your industry] in the last 24 hours?" and get a sourced briefing delivered to Slack.',
                    'The competitive intelligence pipeline: Set up weekly automated queries: "What did [competitor] announce this week? Include product launches, pricing changes, partnerships, and executive statements. Link to primary sources." Run this for each competitor and aggregate into a dashboard.',
                    'Research automation: Use the API to enrich your data. Have a list of companies? For each: "Research [company name]. Return: founding year, estimated revenue range, number of employees, recent funding, key products, and primary competitors. Return as JSON." Process hundreds of companies overnight.',
                    'Knowledge base builder: Pipe Perplexity API results into a structured database. Every day, research trending topics in your field, extract key facts with citations, and store them. Over time, you build a proprietary knowledge base that\'s always current and always sourced.',
                ],
                practiceTask: 'Design a weekly research routine: write 5 Perplexity queries that would keep you fully informed about your professional domain',
            },
        ],
    },
    'Midjourney': {
        overview: 'Midjourney is the gold standard for AI image generation — specifically for artistic, photorealistic, and aesthetically polished output. It doesn\'t just generate images; it creates art. If DALL-E is a digital camera, Midjourney is a professional photography studio.',
        whoItsFor: ['Designers and creative professionals', 'Marketing teams needing visual content', 'Anyone who cares about visual quality over convenience', 'Concept artists and visual storytellers'],
        verdict: { rating: 'Depends', summary: 'Best image quality, period. But Discord-only interface is friction. Use Midjourney for final assets, DALL-E for quick iterations.', vsGPT: 'Midjourney produces dramatically better images. ChatGPT (DALL-E) is more convenient and better for quick drafts. Use both: DALL-E to prototype, Midjourney to produce.' },
        masteryLessons: [
            {
                level: 'Beginner', title: 'Prompt Architecture That Works',
                preview: 'Learn the 5-layer prompt structure that consistently produces professional-quality images.',
                steps: [
                    'The 5-layer prompt structure: [Subject], [Style], [Lighting], [Mood], [Technical]. Example: "A senior software engineer debugging code at midnight, digital illustration style, dramatic rim lighting from monitor glow, focused and intense mood, 16:9 aspect ratio --v 6" — each layer adds specificity that Midjourney rewards.',
                    'Style keywords that transform output: "editorial photography" → magazine quality. "Wes Anderson aesthetic" → symmetrical and pastel. "brutalist design" → bold and geometric. "cinematic still" → movie frame quality. "architectural visualization" → photorealistic rooms. Collect the style keywords that match your brand.',
                    'Parameters matter: --ar 16:9 (widescreen), --ar 9:16 (phone), --ar 1:1 (social). --s 750 (high stylization). --c 25 (variety). --q 2 (quality). --no text (avoid text in images). Start with defaults, then tune. Example: "--ar 16:9 --s 500 --q 2" for hero images.',
                    'The negative prompt technique: Use --no to exclude unwanted elements. "--no text, watermark, blurry, distorted hands, extra fingers" cleans up common artifacts. For product shots: "--no background clutter, shadows, reflections" gives you clean assets.',
                ],
                practiceTask: 'Generate 4 variations of the same concept using different style keywords. Compare to see which style best matches your brand.',
            },
            {
                level: 'Intermediate', title: 'Image References & Style Consistency',
                preview: 'Use reference images, style references, and character references for brand-consistent output.',
                steps: [
                    'Image prompting: Upload an image and Midjourney uses it as a reference. Syntax: paste image URL + your text prompt. The image influences composition, color, and style. Use this for: maintaining brand consistency, iterating on concepts, and style transfer.',
                    'Style Reference (--sref): Upload a style reference image and all generated images adopt that visual style. Create your brand\'s "style anchor" image, then use --sref for everything. Your entire visual library becomes consistent without describing the style every time.',
                    'Character Reference (--cref): Generate a character once, then use --cref to keep that character consistent across multiple images. Essential for: brand mascots, social media characters, storyboarding, and sequential illustrations.',
                    'The remix technique: Generate an image you like, then hit Remix. Modify one element while keeping the rest. "Same composition but change the season to winter." "Same character but in a different outfit." This is iterative design at its fastest.',
                ],
                practiceTask: 'Create a 3-image series with consistent style using --sref and consistent characters using --cref',
            },
            {
                level: 'Advanced', title: 'Professional Workflows & Automation',
                preview: 'Build production workflows: batch generation, upscaling pipelines, and integration with design tools.',
                steps: [
                    'Batch generation strategy: Write 10 prompts in a text file with the base style locked: "[prompt] --sref [your style URL] --ar 16:9 --s 500". Paste them rapidly into Discord. This gives you 40 image options (4 per prompt) in minutes. Used by marketing teams for entire campaign visual libraries.',
                    'The upscaling pipeline: Midjourney → upscale → Magnific AI or Topaz (for 4x resolution) → Photoshop (for final touches). This workflow produces print-quality images from AI generation. The midjourney 2x upscale is good; external upscalers give you magazine-quality.',
                    'Inpainting and editing: Use Midjourney\'s /vary (region) to selectively regenerate parts of an image. Select a region → describe what you want there. Perfect for: fixing hands, changing backgrounds, adding/removing elements without regenerating the whole image.',
                    'Design tool integration: Generate in Midjourney → download → drag into Figma or Canva → use as a design element. For web design: generate hero images, icons, illustrations, and backgrounds in Midjourney with consistent --sref, then compose in your design tool. This is how many agencies actually work.',
                ],
                practiceTask: 'Create a mini brand visual kit: 1 hero image, 3 supporting images, and 2 icons — all with consistent style using --sref',
            },
        ],
    },
    'Gemini': {
        overview: 'Google\'s Gemini is the AI assistant with the largest context window (1M+ tokens) and deepest integration with Google\'s ecosystem. It excels when you need to process massive amounts of information — entire codebases, book-length documents, or hours of video — and when you want AI that connects to your Gmail, Docs, and Drive.',
        whoItsFor: ['Google Workspace power users', 'Anyone processing very large documents', 'Developers using Google Cloud', 'People who want AI integrated into tools they already use'],
        verdict: { rating: 'Yes', summary: 'Best for large context tasks and Google ecosystem integration. The 1M+ token window is genuinely game-changing for certain workflows.', vsGPT: 'Gemini processes 10x more context than ChatGPT. ChatGPT has better plugins and a smoother UI. Use Gemini for massive documents, ChatGPT for everything else.' },
        masteryLessons: [
            {
                level: 'Beginner', title: 'Google Integration & Multimodal Input',
                preview: 'Use Gemini with your Google apps and learn to combine text, images, and files in a single prompt.',
                steps: [
                    'Gemini\'s killer feature at the basic level: Google integration. Ask "Summarize my last 5 emails about Project Alpha" or "Find the document I was working on last Tuesday about the marketing budget." Gemini searches your Gmail and Drive. This alone saves hours per week.',
                    'Multimodal prompting: Upload an image and ask about it. Photo of a whiteboard → "Convert these notes to structured text with action items." Screenshot of an error → "Explain this error, what caused it, and how to fix it." Photo of a chart → "Analyze this chart and identify the 3 most important trends."',
                    'Google Docs integration: In any Google Doc, type @Gemini and ask it to help. "Help me make this paragraph more concise" or "Generate a table of contents for this document" or "Rewrite this in a more formal tone." It edits in-place within your document.',
                    'Try this: Take a photo of any handwritten notes, upload to Gemini, and prompt: "Transcribe these notes. Then organize them into: (1) key decisions, (2) action items with owners, (3) questions to follow up on. Format as a clean document I can share with the team."',
                ],
                practiceTask: 'Use Gemini with one of your Google apps to accomplish a real task faster than you would manually',
            },
            {
                level: 'Intermediate', title: 'The 1M Token Context Window',
                preview: 'Process entire codebases, full books, or hours of transcripts in a single conversation.',
                steps: [
                    'The 1M+ token context window means you can upload: an entire 300-page book, a full codebase (hundreds of files), several hours of meeting transcripts, or a combination of all of these. No other AI can do this. The technique: upload everything FIRST, then ask questions.',
                    'Codebase analysis: Upload your entire project and ask: "Analyze this codebase. Create: (1) an architecture diagram (text-based), (2) a list of all API endpoints with their parameters, (3) potential security vulnerabilities, (4) suggestions for refactoring. Focus on the most critical issues first."',
                    'Book-length analysis: Upload a full manuscript or textbook. "Read this entire document. Create: (1) a chapter-by-chapter summary (2 sentences each), (2) the 10 most important insights, (3) a list of claims that seem unsupported by evidence, (4) how this compares to [other known work on the topic]."',
                    'The "living context" technique: Upload all relevant project documents at the start of a conversation — PRD, tech spec, design doc, meeting notes. Then every question you ask is answered with full project context. "Based on all the documents above, what are the top 3 risks for our Q2 launch?"',
                ],
                practiceTask: 'Upload your longest document (or multiple related documents) and ask Gemini to find something you didn\'t know',
            },
            {
                level: 'Advanced', title: 'Google AI Studio & API Workflows',
                preview: 'Build custom AI applications using Google AI Studio and the Gemini API for automated workflows.',
                steps: [
                    'Google AI Studio (aistudio.google.com) lets you prototype with Gemini models before writing code. Create prompts, test them, tune parameters (temperature, top-k, top-p), and export as API calls. It\'s the fastest path from idea to working AI feature.',
                    'The API workflow: Use Gemini\'s API to build automated pipelines. Example: Every morning, fetch your team\'s GitHub pull requests, send them to Gemini with "Review these PRs for code quality, potential bugs, and missing test coverage. Prioritize by risk level." Get a daily code review digest.',
                    'Structured output: Gemini\'s API supports JSON mode — force the output into a specific schema. Define your schema: { analysis: string, confidence: number, recommendations: string[] }. This makes Gemini\'s output machine-readable for automated workflows.',
                    'The multi-modal pipeline: Build a system that processes multiple input types. Example: Upload product photos → Gemini generates descriptions + tags + SEO metadata → pipe to your e-commerce platform. Or: Upload meeting recordings → transcribe → extract action items → create tasks in your project management tool.',
                ],
                practiceTask: 'Build one automated workflow in Google AI Studio: design a prompt that takes structured input and produces consistent structured output',
            },
        ],
    },
};

export function ToolGuide({ tool, onBack, onStartLesson }: ToolGuideProps) {
    const [generating, setGenerating] = useState<string | null>(null);
    const guide = TOOL_GUIDES[tool.name];

    const handleStartMasteryLesson = async (masteryLesson: typeof TOOL_GUIDES[string]['masteryLessons'][0]) => {
        setGenerating(masteryLesson.level);
        const lesson: LessonData = {
            id: `guide-${tool.id}-${masteryLesson.level}`,
            title: `${tool.name}: ${masteryLesson.title}`,
            category: tool.category,
            duration: '5 min',
            xp: masteryLesson.level === 'Beginner' ? 40 : masteryLesson.level === 'Intermediate' ? 60 : 80,
            difficulty: masteryLesson.level === 'Beginner' ? 1 : masteryLesson.level === 'Intermediate' ? 2 : 3,
            preview: masteryLesson.preview,
            pill: masteryLesson.level.toUpperCase(),
            steps: masteryLesson.steps,
            practiceTask: masteryLesson.practiceTask,
        };
        setGenerating(null);
        onStartLesson(lesson);
    };

    // Fallback for tools without curated guides — generate via Gemini
    if (!guide) {
        return (
            <div className="screen-container">
                <div style={{ height: 44 }} />
                <div style={{ padding: '8px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={onBack} style={{
                        width: 36, height: 36, borderRadius: 12,
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}><ArrowLeft size={18} color="var(--text-2)" /></button>
                    <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>
                        {tool.name} Guide
                    </h1>
                </div>
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📖</div>
                    <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 8px' }}>
                        Guide Coming Soon
                    </h2>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
                        We're building a comprehensive guide for {tool.name}. In the meantime, generate a micro-lesson from the tool detail page.
                    </p>
                </div>
            </div>
        );
    }

    const LEVEL_COLORS: Record<string, string> = {
        'Beginner': 'var(--green)',
        'Intermediate': 'var(--blue)',
        'Advanced': 'var(--orange)',
    };
    const LEVEL_ICONS: Record<string, string> = {
        'Beginner': '🟢',
        'Intermediate': '🔵',
        'Advanced': '🟠',
    };

    return (
        <div className="screen-container">
            <div style={{ height: 44 }} />

            {/* Header */}
            <div style={{ padding: '8px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={onBack} style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}><ArrowLeft size={18} color="var(--text-2)" /></button>
                <div>
                    <span style={{
                        fontFamily: "'Syne', sans-serif", fontSize: 10, fontWeight: 700,
                        textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: 'var(--accent-2)',
                    }}>COMPREHENSIVE GUIDE</span>
                    <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>
                        {tool.name}
                    </h1>
                </div>
            </div>

            {/* Overview */}
            <div style={{ padding: '0 20px', marginBottom: 24 }}>
                <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                    color: 'var(--text-2)', lineHeight: 1.7, margin: 0,
                }}>{guide.overview}</p>
            </div>

            {/* Who It's For */}
            <div style={{ padding: '0 20px', marginBottom: 24 }}>
                <span style={{
                    fontFamily: "'Syne', sans-serif", fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: 'var(--text-3)',
                }}>WHO IT'S FOR</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                    {guide.whoItsFor.map((who, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: 'var(--green)', fontSize: 12 }}>✓</span>
                            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--text-1)' }}>{who}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Is It Worth It? Verdict */}
            <div style={{
                margin: '0 20px 24px', padding: '16px',
                background: guide.verdict.rating === 'Yes'
                    ? 'rgba(52,211,153,0.06)'
                    : guide.verdict.rating === 'No'
                        ? 'rgba(239,68,68,0.06)'
                        : 'rgba(251,191,36,0.06)',
                border: `1px solid ${guide.verdict.rating === 'Yes'
                    ? 'rgba(52,211,153,0.2)'
                    : guide.verdict.rating === 'No'
                        ? 'rgba(239,68,68,0.2)'
                        : 'rgba(251,191,36,0.2)'}`,
                borderRadius: 20,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Zap size={14} color={guide.verdict.rating === 'Yes' ? 'var(--green)' : 'var(--yellow)'} />
                    <span style={{
                        fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700,
                        textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                        color: guide.verdict.rating === 'Yes' ? 'var(--green)' : 'var(--yellow)',
                    }}>IS IT WORTH IT? {guide.verdict.rating.toUpperCase()}</span>
                </div>
                <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                    color: 'var(--text-1)', lineHeight: 1.6, margin: '0 0 8px',
                }}>{guide.verdict.summary}</p>
                <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                    color: 'var(--text-3)', lineHeight: 1.5, margin: 0,
                    fontStyle: 'italic',
                }}>vs ChatGPT: {guide.verdict.vsGPT}</p>
            </div>

            {/* 3-Level Mastery Path */}
            <div style={{ padding: '0 20px', marginBottom: 24 }}>
                <span style={{
                    fontFamily: "'Syne', sans-serif", fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: 'var(--text-3)',
                }}>3-LEVEL MASTERY PATH</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                    {guide.masteryLessons.map((ml) => (
                        <button
                            key={ml.level}
                            onClick={() => handleStartMasteryLesson(ml)}
                            disabled={generating === ml.level}
                            style={{
                                width: '100%', textAlign: 'left', padding: '16px',
                                background: 'var(--surface-2)', border: '1px solid var(--border)',
                                borderRadius: 18, cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                opacity: generating === ml.level ? 0.7 : 1,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <span style={{ fontSize: 16 }}>{LEVEL_ICONS[ml.level]}</span>
                                <span style={{
                                    fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700,
                                    textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                                    color: LEVEL_COLORS[ml.level],
                                }}>{ml.level}</span>
                            </div>
                            <div style={{
                                fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                                fontWeight: 600, color: 'var(--text-1)', marginBottom: 4,
                            }}>{ml.title}</div>
                            <div style={{
                                fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                                color: 'var(--text-3)', lineHeight: 1.5,
                            }}>{ml.preview}</div>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                marginTop: 10, color: 'var(--accent-2)',
                            }}>
                                <BookOpen size={14} />
                                <span style={{
                                    fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
                                }}>
                                    {generating === ml.level ? 'Opening...' : 'Start Lesson'}
                                </span>
                                <ChevronRight size={14} />
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ height: 40 }} />
        </div>
    );
}
