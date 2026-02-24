-- ============================================================
-- Delta AI — Seed Data
-- Migration 003: Organisations, task taxonomy, 21 tools, 6 lessons
-- ============================================================

-- ============================================================
-- ORGANISATIONS
-- ============================================================

INSERT INTO organisations (slug, name, logo_url, website_url, country_code) VALUES
  ('openai',     'OpenAI',     'https://www.google.com/s2/favicons?domain=openai.com&sz=128',           'https://openai.com',         'US'),
  ('anthropic',  'Anthropic',  'https://www.google.com/s2/favicons?domain=anthropic.com&sz=128',        'https://anthropic.com',      'US'),
  ('google',     'Google',     'https://www.google.com/s2/favicons?domain=google.com&sz=128',           'https://google.com',         'US'),
  ('midjourney', 'Midjourney', 'https://www.google.com/s2/favicons?domain=midjourney.com&sz=128',       'https://midjourney.com',     'US'),
  ('vercel',     'Vercel',     'https://www.google.com/s2/favicons?domain=vercel.com&sz=128',           'https://vercel.com',         'US'),
  ('cursor',     'Cursor',     'https://www.google.com/s2/favicons?domain=cursor.com&sz=128',           'https://cursor.com',         'US'),
  ('github',     'GitHub',     'https://www.google.com/s2/favicons?domain=github.com&sz=128',           'https://github.com',         'US'),
  ('notion',     'Notion',     'https://www.google.com/s2/favicons?domain=notion.so&sz=128',            'https://notion.so',          'US'),
  ('deepseek',   'DeepSeek',   'https://www.google.com/s2/favicons?domain=deepseek.com&sz=128',         'https://deepseek.com',       'CN'),
  ('runwayml',   'Runway',     'https://www.google.com/s2/favicons?domain=runwayml.com&sz=128',         'https://runwayml.com',       'US'),
  ('elevenlabs', 'ElevenLabs', 'https://www.google.com/s2/favicons?domain=elevenlabs.io&sz=128',        'https://elevenlabs.io',      'US'),
  ('lovable',    'Lovable',    'https://www.google.com/s2/favicons?domain=lovable.dev&sz=128',          'https://lovable.dev',        'SE'),
  ('replit',     'Replit',     'https://www.google.com/s2/favicons?domain=replit.com&sz=128',           'https://replit.com',         'US'),
  ('perplexity', 'Perplexity', 'https://www.google.com/s2/favicons?domain=perplexity.ai&sz=128',       'https://perplexity.ai',      'US'),
  ('freepik',    'Freepik',    'https://www.google.com/s2/favicons?domain=freepik.com&sz=128',          'https://freepik.com',        'ES'),
  ('krea',       'Krea AI',    'https://www.google.com/s2/favicons?domain=krea.ai&sz=128',              'https://krea.ai',            'US'),
  ('canva',      'Canva',      'https://www.google.com/s2/favicons?domain=canva.com&sz=128',            'https://canva.com',          'AU'),
  ('jasper',     'Jasper',     'https://www.google.com/s2/favicons?domain=jasper.ai&sz=128',            'https://jasper.ai',          'US'),
  ('suno',       'Suno AI',    'https://www.google.com/s2/favicons?domain=suno.com&sz=128',             'https://suno.com',           'US'),
  ('leonardo',   'Leonardo AI','https://www.google.com/s2/favicons?domain=leonardo.ai&sz=128',          'https://leonardo.ai',        'AU'),
  ('meta',       'Meta',       'https://www.google.com/s2/favicons?domain=meta.com&sz=128',             'https://meta.com',           'US'),
  ('mistral',    'Mistral AI', 'https://www.google.com/s2/favicons?domain=mistral.ai&sz=128',           'https://mistral.ai',         'FR'),
  ('stability',  'Stability AI','https://www.google.com/s2/favicons?domain=stability.ai&sz=128',        'https://stability.ai',       'GB')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- TASK TAXONOMY (TAAFT-style with parent-child hierarchy)
-- ============================================================

-- Top-level categories
INSERT INTO tasks (slug, name, emoji, parent_id, sort_order) VALUES
  ('ai-writing',           'AI Writing',            '✍️', NULL, 1),
  ('ai-image-generation',  'AI Image Generation',   '🎨', NULL, 2),
  ('ai-coding',            'AI Coding',             '💻', NULL, 3),
  ('ai-research',          'AI Research',           '🔬', NULL, 4),
  ('ai-video',             'AI Video',              '🎬', NULL, 5),
  ('ai-audio',             'AI Audio & Music',      '🎵', NULL, 6),
  ('ai-productivity',      'AI Productivity',       '📋', NULL, 7),
  ('ai-marketing',         'AI Marketing',          '📈', NULL, 8),
  ('ai-design',            'AI Design',             '🎯', NULL, 9),
  ('ai-data-analysis',     'AI Data Analysis',      '📊', NULL, 10),
  ('ai-education',         'AI Education',          '📚', NULL, 11),
  ('ai-customer-support',  'AI Customer Support',   '🤝', NULL, 12)
ON CONFLICT (slug) DO NOTHING;

-- Sub-categories: AI Writing
INSERT INTO tasks (slug, name, emoji, parent_id, sort_order) VALUES
  ('copywriting',          'Copywriting',           '📝', (SELECT id FROM tasks WHERE slug = 'ai-writing'), 1),
  ('blog-writing',         'Blog Writing',          '📰', (SELECT id FROM tasks WHERE slug = 'ai-writing'), 2),
  ('email-writing',        'Email Writing',         '✉️', (SELECT id FROM tasks WHERE slug = 'ai-writing'), 3),
  ('creative-writing',     'Creative Writing',      '🖊️', (SELECT id FROM tasks WHERE slug = 'ai-writing'), 4),
  ('academic-writing',     'Academic Writing',      '🎓', (SELECT id FROM tasks WHERE slug = 'ai-writing'), 5),
  ('content-rewriting',    'Content Rewriting',     '🔄', (SELECT id FROM tasks WHERE slug = 'ai-writing'), 6),
  ('social-media-copy',    'Social Media Copy',     '📱', (SELECT id FROM tasks WHERE slug = 'ai-writing'), 7)
ON CONFLICT (slug) DO NOTHING;

-- Sub-categories: AI Image Generation
INSERT INTO tasks (slug, name, emoji, parent_id, sort_order) VALUES
  ('text-to-image',        'Text to Image',         '🖼️', (SELECT id FROM tasks WHERE slug = 'ai-image-generation'), 1),
  ('image-editing',        'AI Image Editing',      '✏️', (SELECT id FROM tasks WHERE slug = 'ai-image-generation'), 2),
  ('image-upscaling',      'Image Upscaling',       '🔍', (SELECT id FROM tasks WHERE slug = 'ai-image-generation'), 3),
  ('logo-generation',      'Logo Generation',       '💎', (SELECT id FROM tasks WHERE slug = 'ai-image-generation'), 4),
  ('product-photography',  'Product Photography',   '📸', (SELECT id FROM tasks WHERE slug = 'ai-image-generation'), 5),
  ('character-design',     'Character Design',      '🎭', (SELECT id FROM tasks WHERE slug = 'ai-image-generation'), 6)
ON CONFLICT (slug) DO NOTHING;

-- Sub-categories: AI Coding
INSERT INTO tasks (slug, name, emoji, parent_id, sort_order) VALUES
  ('code-completion',      'Code Completion',       '⚡', (SELECT id FROM tasks WHERE slug = 'ai-coding'), 1),
  ('code-review',          'Code Review',           '🔎', (SELECT id FROM tasks WHERE slug = 'ai-coding'), 2),
  ('app-building',         'App Building',          '📱', (SELECT id FROM tasks WHERE slug = 'ai-coding'), 3),
  ('debugging',            'Debugging',             '🐛', (SELECT id FROM tasks WHERE slug = 'ai-coding'), 4),
  ('api-development',      'API Development',       '🔌', (SELECT id FROM tasks WHERE slug = 'ai-coding'), 5),
  ('testing',              'Test Generation',       '🧪', (SELECT id FROM tasks WHERE slug = 'ai-coding'), 6),
  ('no-code-building',     'No-Code Building',      '🏗️', (SELECT id FROM tasks WHERE slug = 'ai-coding'), 7)
ON CONFLICT (slug) DO NOTHING;

-- Sub-categories: AI Research
INSERT INTO tasks (slug, name, emoji, parent_id, sort_order) VALUES
  ('web-research',         'Web Research',          '🌐', (SELECT id FROM tasks WHERE slug = 'ai-research'), 1),
  ('academic-research',    'Academic Research',     '📄', (SELECT id FROM tasks WHERE slug = 'ai-research'), 2),
  ('fact-checking',        'Fact Checking',         '✅', (SELECT id FROM tasks WHERE slug = 'ai-research'), 3),
  ('competitive-analysis', 'Competitive Analysis',  '📊', (SELECT id FROM tasks WHERE slug = 'ai-research'), 4)
ON CONFLICT (slug) DO NOTHING;

-- Sub-categories: AI Video
INSERT INTO tasks (slug, name, emoji, parent_id, sort_order) VALUES
  ('text-to-video',        'Text to Video',         '🎥', (SELECT id FROM tasks WHERE slug = 'ai-video'), 1),
  ('video-editing',        'Video Editing',         '✂️', (SELECT id FROM tasks WHERE slug = 'ai-video'), 2),
  ('avatar-generation',    'Avatar Generation',     '🧑', (SELECT id FROM tasks WHERE slug = 'ai-video'), 3)
ON CONFLICT (slug) DO NOTHING;

-- Sub-categories: AI Audio
INSERT INTO tasks (slug, name, emoji, parent_id, sort_order) VALUES
  ('text-to-speech',       'Text to Speech',        '🔊', (SELECT id FROM tasks WHERE slug = 'ai-audio'), 1),
  ('voice-cloning',        'Voice Cloning',         '🎤', (SELECT id FROM tasks WHERE slug = 'ai-audio'), 2),
  ('music-generation',     'Music Generation',      '🎹', (SELECT id FROM tasks WHERE slug = 'ai-audio'), 3),
  ('transcription',        'Transcription',         '📝', (SELECT id FROM tasks WHERE slug = 'ai-audio'), 4)
ON CONFLICT (slug) DO NOTHING;

-- Sub-categories: AI Productivity
INSERT INTO tasks (slug, name, emoji, parent_id, sort_order) VALUES
  ('task-automation',      'Task Automation',       '⚙️', (SELECT id FROM tasks WHERE slug = 'ai-productivity'), 1),
  ('meeting-notes',        'Meeting Notes',         '📒', (SELECT id FROM tasks WHERE slug = 'ai-productivity'), 2),
  ('document-analysis',    'Document Analysis',     '📋', (SELECT id FROM tasks WHERE slug = 'ai-productivity'), 3),
  ('scheduling',           'Scheduling',            '📅', (SELECT id FROM tasks WHERE slug = 'ai-productivity'), 4)
ON CONFLICT (slug) DO NOTHING;

-- Sub-categories: AI Marketing
INSERT INTO tasks (slug, name, emoji, parent_id, sort_order) VALUES
  ('seo-optimization',     'SEO Optimization',      '🔍', (SELECT id FROM tasks WHERE slug = 'ai-marketing'), 1),
  ('ad-generation',        'Ad Generation',         '📢', (SELECT id FROM tasks WHERE slug = 'ai-marketing'), 2),
  ('brand-content',        'Brand Content',         '🏷️', (SELECT id FROM tasks WHERE slug = 'ai-marketing'), 3)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- TOOLS (21 curated tools)
-- ============================================================

INSERT INTO tools (slug, name, tagline, description, logo_url, website_url, org_id, is_verified, status,
  pricing_model, price_from, platforms, delta_analysis, role_scores, best_for, use_cases) VALUES

-- 1. Claude
('claude', 'Claude', 'AI assistant for writing & analysis',
 'Anthropic''s AI assistant excels at nuanced writing, complex analysis, and code generation with a 200K context window.',
 'https://www.google.com/s2/favicons?domain=claude.ai&sz=128', 'https://claude.ai',
 (SELECT id FROM organisations WHERE slug = 'anthropic'), TRUE, 'live',
 'Freemium', 20.00, ARRAY['web','ios','android','api'],
 'If you code or write professionally, this is your daily driver.',
 '{"Student": 8, "Non-Technical Pro": 7, "Technical Pro": 10, "Founder": 9, "Creator & Marketer": 8}',
 ARRAY['Developers', 'Writers', 'Creators'],
 ARRAY['Full-Stack Development', 'Novel Writing', 'Research Synthesis']),

-- 2. ChatGPT
('chatgpt', 'ChatGPT', 'Versatile AI assistant by OpenAI',
 'OpenAI''s flagship AI assistant with GPT-4o, image generation, code execution, and Custom GPTs.',
 'https://www.google.com/s2/favicons?domain=openai.com&sz=128', 'https://openai.com',
 (SELECT id FROM organisations WHERE slug = 'openai'), TRUE, 'live',
 'Freemium', 20.00, ARRAY['web','ios','android','api'],
 'The global standard. Instant Reasoning and deep agentic workflows.',
 '{"Student": 9, "Non-Technical Pro": 9, "Technical Pro": 9, "Founder": 9, "Creator & Marketer": 9}',
 ARRAY['Everyone'],
 ARRAY['Complex Planning', 'Agent Orchestration', 'Multimodal Analysis']),

-- 3. Cursor
('cursor', 'Cursor', 'AI-first code editor',
 'AI-native code editor built on VS Code with intelligent autocomplete, chat, and multi-file agent mode.',
 'https://www.google.com/s2/favicons?domain=cursor.com&sz=128', 'https://cursor.com',
 (SELECT id FROM organisations WHERE slug = 'cursor'), TRUE, 'live',
 'Freemium', 20.00, ARRAY['mac','windows','linux'],
 'Essential. It writes 40% of your code for you.',
 '{"Student": 5, "Non-Technical Pro": 2, "Technical Pro": 10, "Founder": 7, "Creator & Marketer": 3}',
 ARRAY['Developers'],
 ARRAY['Software Engineering', 'Refactoring', 'Bug Fixing']),

-- 4. Perplexity
('perplexity', 'Perplexity', 'AI-powered answer engine',
 'Real-time web search engine with AI synthesis, citations, and multi-step research chains.',
 'https://www.google.com/s2/favicons?domain=perplexity.ai&sz=128', 'https://perplexity.ai',
 (SELECT id FROM organisations WHERE slug = 'perplexity'), TRUE, 'live',
 'Freemium', 20.00, ARRAY['web','ios','android'],
 'Google is for links. Perplexity is for answers.',
 '{"Student": 9, "Non-Technical Pro": 8, "Technical Pro": 7, "Founder": 8, "Creator & Marketer": 7}',
 ARRAY['Researchers', 'Students'],
 ARRAY['Deep Dives', 'Fact Checking', 'Academic Citations']),

-- 5. Midjourney
('midjourney', 'Midjourney', 'Photorealistic AI image generation',
 'Industry-leading AI image generation with cinematic quality, style references, and character consistency.',
 'https://www.google.com/s2/favicons?domain=midjourney.com&sz=128', 'https://midjourney.com',
 (SELECT id FROM organisations WHERE slug = 'midjourney'), TRUE, 'live',
 'Paid', 10.00, ARRAY['web'],
 'Renders text perfectly and understands nuance better than any other model.',
 '{"Student": 4, "Non-Technical Pro": 5, "Technical Pro": 3, "Founder": 6, "Creator & Marketer": 10}',
 ARRAY['Designers', 'Filmmakers'],
 ARRAY['Cinematic Stills', 'Short Video Clips', '3D Assets']),

-- 6. Gemini
('gemini', 'Gemini', 'Google''s multimodal AI with 10M+ context',
 'Google''s flagship AI with the largest context window (1M+ tokens), multimodal understanding, and deep Google integration.',
 'https://www.google.com/s2/favicons?domain=gemini.google.com&sz=128', 'https://gemini.google.com',
 (SELECT id FROM organisations WHERE slug = 'google'), TRUE, 'live',
 'Freemium', 20.00, ARRAY['web','ios','android','api'],
 'Unbeatable for large data context. It remembers everything.',
 '{"Student": 8, "Non-Technical Pro": 7, "Technical Pro": 9, "Founder": 8, "Creator & Marketer": 7}',
 ARRAY['Power Users', 'Enterprises'],
 ARRAY['Analyzing Entire Codebases', 'Video Processing', 'Live Translation']),

-- 7. DeepSeek
('deepseek', 'DeepSeek', 'Open-source reasoning powerhouse',
 'Chinese AI lab''s open-source model with exceptional reasoning capabilities, fully free to use.',
 'https://www.google.com/s2/favicons?domain=deepseek.com&sz=128', 'https://chat.deepseek.com',
 (SELECT id FROM organisations WHERE slug = 'deepseek'), TRUE, 'live',
 'Free', NULL, ARRAY['web','api'],
 'The industry disruptor. Incredible reasoning density.',
 '{"Student": 7, "Non-Technical Pro": 5, "Technical Pro": 9, "Founder": 6, "Creator & Marketer": 4}',
 ARRAY['Researchers', 'Open Source Fans'],
 ARRAY['Math Proofs', 'Local LLM Logic', 'Cost-Efficient Analysis']),

-- 8. Sora
('sora', 'Sora', 'Hollywood-quality AI video generation',
 'OpenAI''s text-to-video model with physics simulation and cinematic quality output.',
 'https://www.google.com/s2/favicons?domain=openai.com&sz=128', 'https://openai.com/sora',
 (SELECT id FROM organisations WHERE slug = 'openai'), TRUE, 'live',
 'Freemium', 20.00, ARRAY['web'],
 'Mind-blowing physics simulation.',
 '{"Student": 4, "Non-Technical Pro": 5, "Technical Pro": 3, "Founder": 6, "Creator & Marketer": 9}',
 ARRAY['Creators'],
 ARRAY['Marketing Ads', 'Film prototyping', 'Social Content']),

-- 9. Runway
('runway', 'Runway', 'Professional AI video editing',
 'Professional creative AI suite with Gen-3 video generation, motion brushes, and cinematic controls.',
 'https://www.google.com/s2/favicons?domain=runwayml.com&sz=128', 'https://runwayml.com',
 (SELECT id FROM organisations WHERE slug = 'runwayml'), TRUE, 'live',
 'Freemium', 12.00, ARRAY['web'],
 'Best control for character movement in AI video.',
 '{"Student": 3, "Non-Technical Pro": 4, "Technical Pro": 3, "Founder": 5, "Creator & Marketer": 9}',
 ARRAY['Creators', 'Filmmakers'],
 ARRAY['Short Films', 'Marketing', 'Social Content']),

-- 10. Notion AI
('notion-ai', 'Notion AI', 'AI-powered workspace for teams',
 'AI layer on top of Notion''s workspace with Q&A, writing assistance, and automated documentation.',
 'https://www.google.com/s2/favicons?domain=notion.so&sz=128', 'https://notion.so',
 (SELECT id FROM organisations WHERE slug = 'notion'), TRUE, 'live',
 'Freemium', 10.00, ARRAY['web','mac','windows','ios','android'],
 'Great for organising thoughts and turning notes into action.',
 '{"Student": 7, "Non-Technical Pro": 8, "Technical Pro": 6, "Founder": 8, "Creator & Marketer": 7}',
 ARRAY['Teams', 'Students'],
 ARRAY['Notes', 'Docs', 'Project Planning']),

-- 11. Krea AI
('krea-ai', 'Krea AI', 'Real-time image generation & upscaling',
 'Real-time AI canvas with live generation, upscaling, and pattern creation.',
 'https://www.google.com/s2/favicons?domain=krea.ai&sz=128', 'https://krea.ai',
 (SELECT id FROM organisations WHERE slug = 'krea'), TRUE, 'live',
 'Freemium', 5.00, ARRAY['web'],
 'The real-time canvas is a game changer for live performance.',
 '{"Student": 3, "Non-Technical Pro": 4, "Technical Pro": 2, "Founder": 4, "Creator & Marketer": 8}',
 ARRAY['Designers'],
 ARRAY['Live Art', 'Upscaling', 'Pattern Generation']),

-- 12. Lovable
('lovable', 'Lovable', 'AI-powered full-stack app builder',
 'Build production-ready full-stack web apps from natural language descriptions with Supabase backend.',
 'https://www.google.com/s2/favicons?domain=lovable.dev&sz=128', 'https://lovable.dev',
 (SELECT id FROM organisations WHERE slug = 'lovable'), TRUE, 'live',
 'Freemium', 20.00, ARRAY['web'],
 'Build production apps with natural language. No coding needed.',
 '{"Student": 6, "Non-Technical Pro": 8, "Technical Pro": 7, "Founder": 10, "Creator & Marketer": 6}',
 ARRAY['Founders', 'Builders'],
 ARRAY['App Prototyping', 'MVP Building', 'No-Code Development']),

-- 13. Freepik Pikaso
('freepik-pikaso', 'Freepik Pikaso', 'Sketch-to-image in real time',
 'Real-time sketch-to-image AI tool that turns rough drawings into polished visuals instantly.',
 'https://www.google.com/s2/favicons?domain=freepik.com&sz=128', 'https://freepik.com/pikaso',
 (SELECT id FROM organisations WHERE slug = 'freepik'), TRUE, 'live',
 'Freemium', 9.00, ARRAY['web'],
 'The fastest way to get an idea out of your head.',
 '{"Student": 4, "Non-Technical Pro": 5, "Technical Pro": 2, "Founder": 5, "Creator & Marketer": 7}',
 ARRAY['Designers'],
 ARRAY['Concept Art', 'Rapid Prototyping']),

-- 14. v0
('v0', 'v0', 'AI UI component generator by Vercel',
 'Vercel''s AI-powered tool that generates production-ready React/Next.js components from text descriptions.',
 'https://www.google.com/s2/favicons?domain=v0.dev&sz=128', 'https://v0.dev',
 (SELECT id FROM organisations WHERE slug = 'vercel'), TRUE, 'live',
 'Freemium', 20.00, ARRAY['web'],
 'Generate production-ready React components from text descriptions.',
 '{"Student": 5, "Non-Technical Pro": 4, "Technical Pro": 9, "Founder": 7, "Creator & Marketer": 4}',
 ARRAY['Developers', 'Designers'],
 ARRAY['UI Prototyping', 'Component Generation', 'Design to Code']),

-- 15. ElevenLabs
('elevenlabs', 'ElevenLabs', 'AI voice generation & text-to-speech',
 'Industry-leading AI voice synthesis with voice cloning, text-to-speech, and real-time dubbing.',
 'https://www.google.com/s2/favicons?domain=elevenlabs.io&sz=128', 'https://elevenlabs.io',
 (SELECT id FROM organisations WHERE slug = 'elevenlabs'), TRUE, 'live',
 'Freemium', 5.00, ARRAY['web','api'],
 'The most realistic AI voices. Clone your own voice in minutes.',
 '{"Student": 3, "Non-Technical Pro": 5, "Technical Pro": 4, "Founder": 6, "Creator & Marketer": 9}',
 ARRAY['Creators', 'Marketers'],
 ARRAY['Voice Cloning', 'Audiobooks', 'Video Narration', 'Podcasts']),

-- 16. GitHub Copilot
('github-copilot', 'GitHub Copilot', 'AI pair programmer in your editor',
 'AI code completion tool that integrates with VS Code, JetBrains, and Neovim for inline suggestions and chat.',
 'https://www.google.com/s2/favicons?domain=github.com&sz=128', 'https://github.com/features/copilot',
 (SELECT id FROM organisations WHERE slug = 'github'), TRUE, 'live',
 'Freemium', 10.00, ARRAY['web','mac','windows','linux'],
 'The OG coding copilot. Still the best for inline suggestions.',
 '{"Student": 6, "Non-Technical Pro": 2, "Technical Pro": 10, "Founder": 5, "Creator & Marketer": 2}',
 ARRAY['Developers'],
 ARRAY['Code Completion', 'Test Generation', 'Documentation']),

-- 17. Canva AI
('canva-ai', 'Canva AI', 'AI-powered design platform',
 'Canva''s AI features include Magic Design, text-to-image, background removal, and brand kit automation.',
 'https://www.google.com/s2/favicons?domain=canva.com&sz=128', 'https://canva.com',
 (SELECT id FROM organisations WHERE slug = 'canva'), TRUE, 'live',
 'Freemium', 13.00, ARRAY['web','ios','android'],
 'AI features baked into a tool 100M people already use.',
 '{"Student": 7, "Non-Technical Pro": 9, "Technical Pro": 3, "Founder": 7, "Creator & Marketer": 10}',
 ARRAY['Marketers', 'Non-Technical'],
 ARRAY['Social Media Graphics', 'Presentations', 'Brand Design']),

-- 18. Jasper
('jasper', 'Jasper', 'Enterprise AI content platform',
 'Enterprise AI marketing platform with brand voice, campaign generation, and team workflows.',
 'https://www.google.com/s2/favicons?domain=jasper.ai&sz=128', 'https://jasper.ai',
 (SELECT id FROM organisations WHERE slug = 'jasper'), TRUE, 'live',
 'Paid', 49.00, ARRAY['web'],
 'Built for marketing teams. Brand voice + campaign orchestration.',
 '{"Student": 2, "Non-Technical Pro": 6, "Technical Pro": 2, "Founder": 5, "Creator & Marketer": 9}',
 ARRAY['Marketers', 'Teams'],
 ARRAY['Marketing Copy', 'Brand Content', 'Ad Generation']),

-- 19. Replit
('replit', 'Replit', 'AI-powered cloud IDE & deployment',
 'Cloud-based coding environment with AI assistant, instant deployment, and collaborative editing.',
 'https://www.google.com/s2/favicons?domain=replit.com&sz=128', 'https://replit.com',
 (SELECT id FROM organisations WHERE slug = 'replit'), TRUE, 'live',
 'Freemium', 25.00, ARRAY['web','ios','android'],
 'Write code, deploy instantly. The complete AI dev environment.',
 '{"Student": 8, "Non-Technical Pro": 6, "Technical Pro": 7, "Founder": 8, "Creator & Marketer": 4}',
 ARRAY['Beginners', 'Builders'],
 ARRAY['Rapid Prototyping', 'Learning to Code', 'Full-Stack Apps']),

-- 20. Suno AI
('suno-ai', 'Suno AI', 'AI music generation from text',
 'Generate full-length songs with vocals, instruments, and lyrics from text descriptions.',
 'https://www.google.com/s2/favicons?domain=suno.com&sz=128', 'https://suno.com',
 (SELECT id FROM organisations WHERE slug = 'suno'), TRUE, 'live',
 'Freemium', 10.00, ARRAY['web'],
 'Type a description, get a full song. The Midjourney of music.',
 '{"Student": 4, "Non-Technical Pro": 5, "Technical Pro": 3, "Founder": 4, "Creator & Marketer": 8}',
 ARRAY['Creators', 'Content Makers'],
 ARRAY['Music Production', 'Content Soundtracks', 'Jingles']),

-- 21. Leonardo AI
('leonardo-ai', 'Leonardo AI', 'AI image generation with fine-tuned models',
 'AI image generation platform with custom model training, consistent character generation, and brand asset creation.',
 'https://www.google.com/s2/favicons?domain=leonardo.ai&sz=128', 'https://leonardo.ai',
 (SELECT id FROM organisations WHERE slug = 'leonardo'), TRUE, 'live',
 'Freemium', 10.00, ARRAY['web'],
 'Train custom models on your style. Best for consistent brand imagery.',
 '{"Student": 3, "Non-Technical Pro": 5, "Technical Pro": 3, "Founder": 5, "Creator & Marketer": 8}',
 ARRAY['Designers', 'Game Developers'],
 ARRAY['Brand Assets', 'Game Art', 'Product Mockups'])

ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- TOOL-TASK MAPPINGS
-- ============================================================

-- Claude
INSERT INTO tool_tasks (tool_id, task_id, is_primary) VALUES
  ((SELECT id FROM tools WHERE slug = 'claude'), (SELECT id FROM tasks WHERE slug = 'ai-writing'), TRUE),
  ((SELECT id FROM tools WHERE slug = 'claude'), (SELECT id FROM tasks WHERE slug = 'ai-coding'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'claude'), (SELECT id FROM tasks WHERE slug = 'ai-research'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'claude'), (SELECT id FROM tasks WHERE slug = 'copywriting'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'claude'), (SELECT id FROM tasks WHERE slug = 'code-review'), FALSE)
ON CONFLICT (tool_id, task_id) DO NOTHING;

-- ChatGPT
INSERT INTO tool_tasks (tool_id, task_id, is_primary) VALUES
  ((SELECT id FROM tools WHERE slug = 'chatgpt'), (SELECT id FROM tasks WHERE slug = 'ai-writing'), TRUE),
  ((SELECT id FROM tools WHERE slug = 'chatgpt'), (SELECT id FROM tasks WHERE slug = 'ai-coding'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'chatgpt'), (SELECT id FROM tasks WHERE slug = 'ai-research'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'chatgpt'), (SELECT id FROM tasks WHERE slug = 'ai-productivity'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'chatgpt'), (SELECT id FROM tasks WHERE slug = 'ai-image-generation'), FALSE)
ON CONFLICT (tool_id, task_id) DO NOTHING;

-- Cursor
INSERT INTO tool_tasks (tool_id, task_id, is_primary) VALUES
  ((SELECT id FROM tools WHERE slug = 'cursor'), (SELECT id FROM tasks WHERE slug = 'ai-coding'), TRUE),
  ((SELECT id FROM tools WHERE slug = 'cursor'), (SELECT id FROM tasks WHERE slug = 'code-completion'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'cursor'), (SELECT id FROM tasks WHERE slug = 'debugging'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'cursor'), (SELECT id FROM tasks WHERE slug = 'code-review'), FALSE)
ON CONFLICT (tool_id, task_id) DO NOTHING;

-- Perplexity
INSERT INTO tool_tasks (tool_id, task_id, is_primary) VALUES
  ((SELECT id FROM tools WHERE slug = 'perplexity'), (SELECT id FROM tasks WHERE slug = 'ai-research'), TRUE),
  ((SELECT id FROM tools WHERE slug = 'perplexity'), (SELECT id FROM tasks WHERE slug = 'web-research'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'perplexity'), (SELECT id FROM tasks WHERE slug = 'academic-research'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'perplexity'), (SELECT id FROM tasks WHERE slug = 'fact-checking'), FALSE)
ON CONFLICT (tool_id, task_id) DO NOTHING;

-- Midjourney
INSERT INTO tool_tasks (tool_id, task_id, is_primary) VALUES
  ((SELECT id FROM tools WHERE slug = 'midjourney'), (SELECT id FROM tasks WHERE slug = 'ai-image-generation'), TRUE),
  ((SELECT id FROM tools WHERE slug = 'midjourney'), (SELECT id FROM tasks WHERE slug = 'text-to-image'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'midjourney'), (SELECT id FROM tasks WHERE slug = 'character-design'), FALSE)
ON CONFLICT (tool_id, task_id) DO NOTHING;

-- Gemini
INSERT INTO tool_tasks (tool_id, task_id, is_primary) VALUES
  ((SELECT id FROM tools WHERE slug = 'gemini'), (SELECT id FROM tasks WHERE slug = 'ai-research'), TRUE),
  ((SELECT id FROM tools WHERE slug = 'gemini'), (SELECT id FROM tasks WHERE slug = 'ai-coding'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'gemini'), (SELECT id FROM tasks WHERE slug = 'ai-productivity'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'gemini'), (SELECT id FROM tasks WHERE slug = 'document-analysis'), FALSE)
ON CONFLICT (tool_id, task_id) DO NOTHING;

-- DeepSeek
INSERT INTO tool_tasks (tool_id, task_id, is_primary) VALUES
  ((SELECT id FROM tools WHERE slug = 'deepseek'), (SELECT id FROM tasks WHERE slug = 'ai-research'), TRUE),
  ((SELECT id FROM tools WHERE slug = 'deepseek'), (SELECT id FROM tasks WHERE slug = 'ai-coding'), FALSE)
ON CONFLICT (tool_id, task_id) DO NOTHING;

-- Sora
INSERT INTO tool_tasks (tool_id, task_id, is_primary) VALUES
  ((SELECT id FROM tools WHERE slug = 'sora'), (SELECT id FROM tasks WHERE slug = 'ai-video'), TRUE),
  ((SELECT id FROM tools WHERE slug = 'sora'), (SELECT id FROM tasks WHERE slug = 'text-to-video'), FALSE)
ON CONFLICT (tool_id, task_id) DO NOTHING;

-- Runway
INSERT INTO tool_tasks (tool_id, task_id, is_primary) VALUES
  ((SELECT id FROM tools WHERE slug = 'runway'), (SELECT id FROM tasks WHERE slug = 'ai-video'), TRUE),
  ((SELECT id FROM tools WHERE slug = 'runway'), (SELECT id FROM tasks WHERE slug = 'text-to-video'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'runway'), (SELECT id FROM tasks WHERE slug = 'video-editing'), FALSE)
ON CONFLICT (tool_id, task_id) DO NOTHING;

-- Notion AI
INSERT INTO tool_tasks (tool_id, task_id, is_primary) VALUES
  ((SELECT id FROM tools WHERE slug = 'notion-ai'), (SELECT id FROM tasks WHERE slug = 'ai-productivity'), TRUE),
  ((SELECT id FROM tools WHERE slug = 'notion-ai'), (SELECT id FROM tasks WHERE slug = 'ai-writing'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'notion-ai'), (SELECT id FROM tasks WHERE slug = 'document-analysis'), FALSE)
ON CONFLICT (tool_id, task_id) DO NOTHING;

-- Krea AI
INSERT INTO tool_tasks (tool_id, task_id, is_primary) VALUES
  ((SELECT id FROM tools WHERE slug = 'krea-ai'), (SELECT id FROM tasks WHERE slug = 'ai-image-generation'), TRUE),
  ((SELECT id FROM tools WHERE slug = 'krea-ai'), (SELECT id FROM tasks WHERE slug = 'image-upscaling'), FALSE)
ON CONFLICT (tool_id, task_id) DO NOTHING;

-- Lovable
INSERT INTO tool_tasks (tool_id, task_id, is_primary) VALUES
  ((SELECT id FROM tools WHERE slug = 'lovable'), (SELECT id FROM tasks WHERE slug = 'ai-coding'), TRUE),
  ((SELECT id FROM tools WHERE slug = 'lovable'), (SELECT id FROM tasks WHERE slug = 'no-code-building'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'lovable'), (SELECT id FROM tasks WHERE slug = 'app-building'), FALSE)
ON CONFLICT (tool_id, task_id) DO NOTHING;

-- Freepik Pikaso
INSERT INTO tool_tasks (tool_id, task_id, is_primary) VALUES
  ((SELECT id FROM tools WHERE slug = 'freepik-pikaso'), (SELECT id FROM tasks WHERE slug = 'ai-image-generation'), TRUE),
  ((SELECT id FROM tools WHERE slug = 'freepik-pikaso'), (SELECT id FROM tasks WHERE slug = 'ai-design'), FALSE)
ON CONFLICT (tool_id, task_id) DO NOTHING;

-- v0
INSERT INTO tool_tasks (tool_id, task_id, is_primary) VALUES
  ((SELECT id FROM tools WHERE slug = 'v0'), (SELECT id FROM tasks WHERE slug = 'ai-coding'), TRUE),
  ((SELECT id FROM tools WHERE slug = 'v0'), (SELECT id FROM tasks WHERE slug = 'ai-design'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'v0'), (SELECT id FROM tasks WHERE slug = 'app-building'), FALSE)
ON CONFLICT (tool_id, task_id) DO NOTHING;

-- ElevenLabs
INSERT INTO tool_tasks (tool_id, task_id, is_primary) VALUES
  ((SELECT id FROM tools WHERE slug = 'elevenlabs'), (SELECT id FROM tasks WHERE slug = 'ai-audio'), TRUE),
  ((SELECT id FROM tools WHERE slug = 'elevenlabs'), (SELECT id FROM tasks WHERE slug = 'text-to-speech'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'elevenlabs'), (SELECT id FROM tasks WHERE slug = 'voice-cloning'), FALSE)
ON CONFLICT (tool_id, task_id) DO NOTHING;

-- GitHub Copilot
INSERT INTO tool_tasks (tool_id, task_id, is_primary) VALUES
  ((SELECT id FROM tools WHERE slug = 'github-copilot'), (SELECT id FROM tasks WHERE slug = 'ai-coding'), TRUE),
  ((SELECT id FROM tools WHERE slug = 'github-copilot'), (SELECT id FROM tasks WHERE slug = 'code-completion'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'github-copilot'), (SELECT id FROM tasks WHERE slug = 'testing'), FALSE)
ON CONFLICT (tool_id, task_id) DO NOTHING;

-- Canva AI
INSERT INTO tool_tasks (tool_id, task_id, is_primary) VALUES
  ((SELECT id FROM tools WHERE slug = 'canva-ai'), (SELECT id FROM tasks WHERE slug = 'ai-design'), TRUE),
  ((SELECT id FROM tools WHERE slug = 'canva-ai'), (SELECT id FROM tasks WHERE slug = 'ai-image-generation'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'canva-ai'), (SELECT id FROM tasks WHERE slug = 'ai-marketing'), FALSE)
ON CONFLICT (tool_id, task_id) DO NOTHING;

-- Jasper
INSERT INTO tool_tasks (tool_id, task_id, is_primary) VALUES
  ((SELECT id FROM tools WHERE slug = 'jasper'), (SELECT id FROM tasks WHERE slug = 'ai-marketing'), TRUE),
  ((SELECT id FROM tools WHERE slug = 'jasper'), (SELECT id FROM tasks WHERE slug = 'ai-writing'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'jasper'), (SELECT id FROM tasks WHERE slug = 'brand-content'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'jasper'), (SELECT id FROM tasks WHERE slug = 'ad-generation'), FALSE)
ON CONFLICT (tool_id, task_id) DO NOTHING;

-- Replit
INSERT INTO tool_tasks (tool_id, task_id, is_primary) VALUES
  ((SELECT id FROM tools WHERE slug = 'replit'), (SELECT id FROM tasks WHERE slug = 'ai-coding'), TRUE),
  ((SELECT id FROM tools WHERE slug = 'replit'), (SELECT id FROM tasks WHERE slug = 'app-building'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'replit'), (SELECT id FROM tasks WHERE slug = 'ai-education'), FALSE)
ON CONFLICT (tool_id, task_id) DO NOTHING;

-- Suno AI
INSERT INTO tool_tasks (tool_id, task_id, is_primary) VALUES
  ((SELECT id FROM tools WHERE slug = 'suno-ai'), (SELECT id FROM tasks WHERE slug = 'ai-audio'), TRUE),
  ((SELECT id FROM tools WHERE slug = 'suno-ai'), (SELECT id FROM tasks WHERE slug = 'music-generation'), FALSE)
ON CONFLICT (tool_id, task_id) DO NOTHING;

-- Leonardo AI
INSERT INTO tool_tasks (tool_id, task_id, is_primary) VALUES
  ((SELECT id FROM tools WHERE slug = 'leonardo-ai'), (SELECT id FROM tasks WHERE slug = 'ai-image-generation'), TRUE),
  ((SELECT id FROM tools WHERE slug = 'leonardo-ai'), (SELECT id FROM tasks WHERE slug = 'text-to-image'), FALSE),
  ((SELECT id FROM tools WHERE slug = 'leonardo-ai'), (SELECT id FROM tasks WHERE slug = 'character-design'), FALSE)
ON CONFLICT (tool_id, task_id) DO NOTHING;

-- ============================================================
-- CURATED LESSONS (6 tool guides)
-- ============================================================

INSERT INTO lessons (tool_id, title, summary, steps, difficulty, duration_mins, xp_reward, source_type, pill_label,
  quiz_question, quiz_options, quiz_answer_idx, practice_task, task_prompt) VALUES

-- Claude lesson
((SELECT id FROM tools WHERE slug = 'claude'),
 'Master Claude: Role + Constraint Prompting',
 'Learn the two techniques that make Claude produce dramatically better output: role assignment and constraint layering.',
 '[
   {"step": 1, "heading": "Role Prompting", "content": "Role prompting is the #1 technique for quality output. Instead of ''write me an email'', say ''You are a senior communications director at a Fortune 500 company. Write a client follow-up email.'' Why? Claude adjusts its vocabulary, tone, and depth based on the role."},
   {"step": 2, "heading": "Adding Constraints", "content": "Constraints prevent the AI from rambling. After your role + instruction, add: ''Keep it under 120 words. Use bullet points for action items. Do not mention pricing. End with a specific next step.'' Each constraint narrows the output toward exactly what you need."},
   {"step": 3, "heading": "Combined Prompt", "content": "Try this: ''You are a senior product manager reviewing a feature spec. Analyze the following idea: [paste your idea]. List exactly 3 strengths, 3 weaknesses, and 1 alternative approach. Keep each point to 1-2 sentences. Do not use marketing language.''"},
   {"step": 4, "heading": "Chain Prompts", "content": "Power technique: After the first response, say ''Now rewrite this as if explaining to a non-technical stakeholder. Keep the same insights but simplify the language.'' This gives you two perfectly tailored versions in seconds."}
 ]'::JSONB,
 2, 3, 50, 'manual', 'TOOL GUIDE',
 'What makes role prompting effective?',
 ARRAY['It makes Claude respond faster', 'Claude adjusts vocabulary, tone, and depth based on the assigned role', 'It bypasses safety filters', 'It reduces token usage'],
 1,
 'Take the last email or document you wrote and rewrite the prompt using Role + Constraint + Chain technique',
 'You are a senior product manager at a high-growth tech startup. Analyze this product idea:\n\n[Paste your idea here]\n\n1. Three specific strengths\n2. Three specific weaknesses\n3. One alternative approach\n4. Recommended next step\n\nKeep each point to 1-2 sentences. Be direct — no marketing fluff.'),

-- ChatGPT lesson
((SELECT id FROM tools WHERE slug = 'chatgpt'),
 'ChatGPT Power: Custom Instructions',
 'Learn how Custom Instructions make ChatGPT remember your preferences across every conversation.',
 '[
   {"step": 1, "heading": "Setting Up", "content": "Custom Instructions let you set persistent context for EVERY conversation. Go to Settings → Personalization. First box: your role, industry, communication style, key tools. This transforms every response to be role-appropriate."},
   {"step": 2, "heading": "Response Format", "content": "Second box controls output format. Try: ''Be concise. Use bullet points. When I ask for code, include comments explaining WHY. Default to practical examples. If uncertain, say so.'' This eliminates generic responses."},
   {"step": 3, "heading": "Before & After", "content": "Ask ''Help me write a project update'' with and without Custom Instructions. Without: generic template. With ''I am a software engineering lead reporting to VP of Engineering'': focused, role-appropriate update with right technical depth."},
   {"step": 4, "heading": "Specialized Modes", "content": "Advanced: Create modes using prefixes. ''When I start with /review, act as code reviewer. /write = technical writer. /debug = debugging specialist.'' This gives you 3 AI assistants in one."}
 ]'::JSONB,
 2, 3, 50, 'manual', 'TOOL GUIDE',
 'Where do you find Custom Instructions in ChatGPT?',
 ARRAY['In the chat input box', 'Settings → Personalization → Custom Instructions', 'By typing /instructions', 'In the sidebar menu'],
 1,
 'Set up your Custom Instructions with specific details about your role and preferred response format',
 'Help me fill in my ChatGPT Custom Instructions.\n\nRole: [Your role]\nIndustry: [Your industry]\nKey tools: [List tools]\nPreferred style: [Formal/casual/technical]\n\nGenerate optimized text for both boxes (150 + 100 words max).'),

-- Cursor lesson
((SELECT id FROM tools WHERE slug = 'cursor'),
 'Cursor: The .cursorrules Power Move',
 'Learn how a single file in your project root makes Cursor write code in YOUR style.',
 '[
   {"step": 1, "heading": ".cursorrules File", "content": "A plain text file in your project root that Cursor reads before every interaction. Key insight: Cursor generates dramatically better code when it knows your conventions. Example: ''TypeScript strict mode. Explicit return types. Early returns over nested if-else.''"},
   {"step": 2, "heading": "Structure It", "content": "Organize in sections: ## Tech Stack (frameworks, versions), ## Code Style (naming, patterns), ## Project Context (what the app does), ## Avoid (anti-patterns). Example: ''Avoid: class components, any type, console.log in production.''"},
   {"step": 3, "heading": "@-Mentions", "content": "Use @file to reference patterns (''follow @components/Button.tsx''), @folder for bulk context, @codebase for project-wide questions. More context = better output."},
   {"step": 4, "heading": "Workflow Modes", "content": "Cmd+L = chat (explaining/planning), Cmd+K = inline editing, Cmd+Shift+I = agent (multi-file tasks). Agent mode is powerful but review its changes. Best for: ''Refactor all API calls in @services/ to use new error handling.''"}
 ]'::JSONB,
 2, 3, 50, 'manual', 'TOOL GUIDE',
 'What is the purpose of a .cursorrules file?',
 ARRAY['It configures Cursor''s color theme', 'It tells Cursor your code conventions so it generates better code', 'It limits which files Cursor can edit', 'It stores your API keys'],
 1,
 'Create a .cursorrules file for your current project with at least 3 sections: Tech Stack, Code Style, and Avoid list',
 '# .cursorrules for [Your Project]\n\n## Tech Stack\n- [Framework] v[version]\n- [Language] with [config]\n\n## Code Style\n- [naming convention]\n- Functional components with typed props\n- Maximum function length: 30 lines\n\n## Avoid\n- any type\n- console.log in production\n- Nested ternaries deeper than 2 levels'),

-- Perplexity lesson
((SELECT id FROM tools WHERE slug = 'perplexity'),
 'Perplexity: Research Like a Pro',
 'Learn Focus modes and follow-up chains to do in 5 minutes what takes 2 hours of Google searching.',
 '[
   {"step": 1, "heading": "Focus Modes", "content": "Most people use Perplexity like Google — one question, done. The power is in Focus modes: Academic (peer-reviewed only), Writing (creative), Math (step-by-step), Video (YouTube). Switch modes based on need."},
   {"step": 2, "heading": "Follow-up Chains", "content": "Don''t ask one question — ask 4-5 in sequence. Start broad: ''Latest advances in AI code generation?'' Then narrow: ''How does Cursor differ from Copilot technically?'' Then apply: ''Which is better for TypeScript React?'' Each inherits context."},
   {"step": 3, "heading": "Try This Chain", "content": "Run this now: (1) ''Top 3 AI developments this week'' → (2) Pick one, ''Explain technical details simply'' → (3) ''How can I use this as a [role]?'' → (4) ''Generate step-by-step guide.'' Full research brief in 3 minutes."},
   {"step": 4, "heading": "Collections", "content": "Save research threads in Collections by project/topic. Reference past research in new threads: ''Based on my previous research about [topic], how does this change things?'' Builds a personal knowledge base."}
 ]'::JSONB,
 2, 3, 50, 'manual', 'TOOL GUIDE',
 'What is the benefit of follow-up chains in Perplexity?',
 ARRAY['They cost fewer tokens', 'Each follow-up inherits context from previous answers for deeper research', 'They bypass the search limit', 'They provide different sources each time'],
 1,
 'Run a 4-question research chain on a topic relevant to your current work',
 'I need to research [YOUR TOPIC] thoroughly. Create a 5-question chain:\n\n1. Current state of the field\n2. Most important recent development\n3. Technical details\n4. Application to my role ([YOUR ROLE])\n5. Action plan\n\nFormat questions for direct paste into Perplexity.'),

-- Midjourney lesson
((SELECT id FROM tools WHERE slug = 'midjourney'),
 'Midjourney: Prompt Architecture',
 'Learn the exact prompt structure pros use: Subject + Environment + Style + Parameters.',
 '[
   {"step": 1, "heading": "Prompt Hierarchy", "content": "Prompts follow: Subject > Environment > Style > Mood > Technical. Bad: ''a cat.'' Good: ''a Persian cat on a velvet armchair, dimly lit Victorian library, oil painting style, warm amber tones, cinematic lighting, shallow depth of field.'' Every omitted detail is randomly invented."},
   {"step": 2, "heading": "Parameters", "content": "Essential: --ar 16:9 (aspect ratio), --v 6.1 (model), --s 250 (stylize, higher = more artistic), --q 2 (quality). Try: ''futuristic Tokyo street at night, cyberpunk neon, rain reflections --ar 21:9 --v 6.1 --s 400'' — parameters separate amateur from professional."},
   {"step": 3, "heading": "Style References", "content": "--sref [image URL] copies the style of a reference image. Combine with --sw (style weight, 0-1000): 100 = subtle influence, 800 = dominant. Game-changer for consistent brand aesthetics."},
   {"step": 4, "heading": "Brand Consistency", "content": "Pro workflow: (1) Generate one hero image you love. (2) Use --sref with it + --sw 500 for all subsequent images. (3) Use --cref for consistent characters. Creates unified visual campaigns."}
 ]'::JSONB,
 2, 3, 50, 'manual', 'TOOL GUIDE',
 'What does the --sref parameter do in Midjourney?',
 ARRAY['Sets the image resolution', 'Copies the visual style from a reference image', 'Controls the seed for reproducibility', 'Adjusts the aspect ratio'],
 1,
 'Generate 3 images using Subject+Environment+Style+Parameters, then use --sref with your best result for 2 variations',
 'a thoughtful portrait of a creative entrepreneur in a modern co-working space, natural window light, editorial photography, warm earth tones with accent teal, medium format film, shallow depth of field --ar 3:4 --v 6.1 --s 300 --q 2'),

-- Gemini lesson
((SELECT id FROM tools WHERE slug = 'gemini'),
 'Gemini: Leverage the 1M Context',
 'Gemini''s 1M+ token context window changes everything. Feed it entire documents for analysis no other AI can do.',
 '[
   {"step": 1, "heading": "The Context Advantage", "content": "Gemini''s 1M+ tokens = ~700,000 words. That''s an entire book or codebase in one conversation. Strategy: paste the ENTIRE source material instead of summarizing. Results are dramatically more accurate because nothing is lost."},
   {"step": 2, "heading": "Document Analysis", "content": "Upload a 50-page PDF. Then layer questions: ''Key arguments?'' → ''Where does the author contradict themselves?'' → ''Rewrite section 3 to fix the weakness.'' Gemini cross-references between sections because it has everything in context."},
   {"step": 3, "heading": "Try This", "content": "Paste your longest document and ask: ''Analyze for: (1) logical consistency, (2) missing information, (3) areas needing more evidence, (4) improvements. Quote specific sections.'' The ''quote specific sections'' forces precise, traceable analysis."},
   {"step": 4, "heading": "Code Review", "content": "Paste entire codebase. Ask: ''Identify: (1) bugs missed by linting, (2) inconsistent patterns across files, (3) performance bottlenecks.'' Gemini sees ALL files simultaneously, catching cross-file issues other tools miss."}
 ]'::JSONB,
 2, 3, 50, 'manual', 'TOOL GUIDE',
 'Why is Gemini''s large context window useful?',
 ARRAY['It generates longer responses', 'It can analyze entire documents/codebases simultaneously for cross-reference accuracy', 'It makes the model faster', 'It reduces hallucinations completely'],
 1,
 'Paste your longest document into Gemini and run the 4-point analysis from Step 3',
 'You have my complete [document/codebase]. Evaluate:\n1. LOGICAL CONSISTENCY — contradictions? Quote specific sections.\n2. COMPLETENESS — what information is missing?\n3. QUALITY ISSUES — weakest sections?\n4. IMPROVEMENTS — specific fix for each issue.\n\nFormat with headers and quote original text.')

ON CONFLICT DO NOTHING;
