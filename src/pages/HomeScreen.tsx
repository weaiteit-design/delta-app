import React, { useState, useEffect } from 'react';
import { storageService } from '../entities/user/storageService';
import { contentPipeline, scoreForUser } from '../entities/news/contentPipeline';
import { getPipelineStats } from '../entities/news/contentCache';
import { deltaService, CURATED_TOOLS } from '../shared/api/deltaService';
import { VerifiedUpdate, ToolData, LessonData } from '../shared/types/types';
import { StreakBar } from '../shared/ui/StreakBar';
import { SectionLabel } from '../shared/ui/SectionLabel';
import { FilterChips } from '../shared/ui/FilterChips';
import { LessonCard } from '../features/LessonCard';
import { ToolCard } from '../features/ToolCard';
import { NewsCard } from '../features/NewsCard';

interface HomeScreenProps {
    onProfile: () => void;
    onSelectTool: (tool: ToolData) => void;
    onSelectUpdate: (update: VerifiedUpdate) => void;
    onStartLesson: (lesson: LessonData) => void;
}

export function HomeScreen({ onProfile, onSelectTool, onSelectUpdate, onStartLesson }: HomeScreenProps) {
    const [toolFilter, setToolFilter] = useState('All');
    const [updates, setUpdates] = useState<VerifiedUpdate[]>([]);
    const [loading, setLoading] = useState(true);

    const user = storageService.getUser();
    const greeting = getGreeting();
    const tools = deltaService.getTools(user.role);
    const trendingTools = tools.slice(0, 6);

    const topLesson: LessonData = {
        id: 'home-lesson',
        title: 'Build a Personal AI Writing Assistant',
        category: 'AI Writing',
        duration: '3 min',
        xp: 50,
        difficulty: 2,
        preview: 'Create a system prompt that captures your exact writing voice — then use it across every AI tool. No more generic outputs.',
        pill: 'RECOMMENDED FOR YOU',
        steps: [
            'System prompts are the most powerful technique most people never use. A system prompt tells the AI HOW to behave before you even ask a question. Think of it as hiring a specific person: "You are a senior technical writer who specializes in making complex topics simple. You write in short, punchy sentences. You avoid jargon. You use analogies from everyday life." — This one instruction transforms every response.',
            'To build YOUR system prompt, you need to analyze your own writing patterns. Here\'s the key insight: your writing style has 4 layers — (1) Tone: formal, casual, witty, warm? (2) Sentence structure: short and punchy or flowing and complex? (3) Vocabulary level: everyday words or domain-specific terms? (4) Signature moves: do you use analogies? Questions? Bullet points? Identify these 4 things about yourself.',
            'Try this prompt right now — paste it into Claude or ChatGPT: "Analyze the following 3 samples of my writing. For each, identify: (1) my tone, (2) my average sentence length, (3) vocabulary complexity, (4) recurring patterns or style signatures. Then create a system prompt that I can use to make AI write in my exact voice. The system prompt should be under 200 words."\n\nThen paste 3 examples of your actual writing below (emails, social posts, anything you\'ve written).',
            'Once you have your system prompt, here\'s the power move: save it in your notes and paste it at the start of every new AI conversation. Even better — if you use ChatGPT, put it in Custom Instructions so it applies automatically. Your AI now writes like YOU, not like a generic bot. Test it by asking: "Using my writing style, draft a LinkedIn post about [your topic]" and compare it to what you\'d get without the system prompt.',
            'Advanced technique — style transfer: Use your system prompt + a specific role combo. Example: "Use my writing style [your system prompt], but apply the structure of a TED talk: open with a surprising stat, build tension, deliver the insight, end with a call to action." This gets you YOUR voice in THEIR format — the best of both worlds.',
        ],
        practiceTask: 'Create your personal writing system prompt by feeding 3 real writing samples into the prompt from Step 3. Save the result and test it with a real writing task today.',
        taskPrompt: 'Analyze the following 3 samples of my writing.\n\nSample 1:\n[Paste a recent email you wrote]\n\nSample 2:\n[Paste a social media post or message]\n\nSample 3:\n[Paste a paragraph from any document you created]\n\nFor each sample, identify:\n1. Tone (formal/casual/witty/warm/direct)\n2. Average sentence length (short/medium/long)\n3. Vocabulary complexity (simple/moderate/technical)\n4. Recurring patterns (analogies? questions? bullet points? specific phrases?)\n\nThen create a reusable SYSTEM PROMPT (under 200 words) that captures my exact writing voice. The system prompt should start with "You are a writer who..." and include all 4 style elements.\n\nFinally, demonstrate the system prompt by rewriting this LinkedIn post in my style: "We just launched our new feature. It helps teams work faster. Try it today."',
    };

    useEffect(() => {
        let mounted = true;
        contentPipeline.getUpdates().then(data => {
            if (mounted) { setUpdates(data); setLoading(false); }
        }).catch(() => { if (mounted) setLoading(false); });
        // Update streak on app load
        storageService.updateStreak();
        return () => { mounted = false; };
    }, []);

    // Personalised top updates — scored for this user
    const topNews = [...updates]
        .map(u => ({ update: u, score: scoreForUser(u, user) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map(s => s.update);

    // Filter tools based on chip selection
    const filteredTools = toolFilter === 'All'
        ? trendingTools
        : toolFilter === 'For Builders'
            ? trendingTools.filter(t => ['Coding', 'General'].includes(t.category))
            : toolFilter === 'For Writers'
                ? trendingTools.filter(t => ['Writing', 'General'].includes(t.category))
                : toolFilter === 'Free'
                    ? trendingTools.filter(() => true) // all curated tools have free tiers
                    : trendingTools;

    // Format day of week
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    // Daily Hack — find best trick/workflow, or use a static fallback so the section always renders
    const dailyHack = [...updates].find(u => u.type === 'trick' || u.type === 'workflow');
    const fallbackHack: VerifiedUpdate = {
        id: 'daily-hack-fallback',
        title: 'The "Before & After" Prompt Technique',
        shortSummary: 'When asking AI to improve something, always show it the "before" version first. Paste your original text, then say: "Rewrite this to be more concise and professional." The AI produces dramatically better results when it can see what it\'s improving.',
        type: 'trick',
        tag: 'AI TRICK',
        source: 'Delta AI',
        sourceDomain: 'delta.app',
        timeAgo: 'Today',
        fomoScore: 9,
        emoji: '💡',
        publishedAt: new Date().toISOString(),
        actionability: 10,
    };
    const displayedHack = dailyHack || (!loading ? fallbackHack : null);

    return (
        <div className="screen-container">
            {/* Status bar */}
            <div style={{ height: 44, padding: '12px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>
                    9:41
                </span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ width: 16, height: 10, border: '1px solid var(--text-2)', borderRadius: 2, position: 'relative' }}>
                        <div style={{ position: 'absolute', inset: 1, background: 'var(--text-2)', borderRadius: 1, width: '70%' }} />
                    </div>
                </div>
            </div>

            {/* Header */}
            <div style={{
                padding: '16px 20px 4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
            }}>
                <div>
                    <h1 style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 22,
                        fontWeight: 700,
                        color: 'var(--text-1)',
                        margin: 0,
                    }}>
                        {greeting}, {user.name}
                    </h1>
                    <p style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        color: 'var(--text-3)',
                        marginTop: 4,
                    }}>
                        {dayOfWeek} · {loading ? 'Loading updates...' : `${updates.length} updates today`}
                    </p>
                </div>
                <button
                    onClick={onProfile}
                    style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                    }}
                >
                    <span style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#fff',
                    }}>{user.initials}</span>
                </button>
            </div>

            {/* Streak Bar */}
            <div style={{ marginTop: 16 }}>
                <StreakBar />
            </div>

            {/* Daily AI Hack — always shown: loading skeleton → live hack → static fallback */}
            <SectionLabel>💡 DAILY AI HACK</SectionLabel>
            <div style={{ padding: '0 20px', marginBottom: 28 }}>
                {loading ? (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(251,146,60,0.06), rgba(251,146,60,0.02))',
                        border: '1px solid rgba(251,146,60,0.15)',
                        borderRadius: 20,
                        padding: '16px',
                    }}>
                        <div className="skeleton" style={{ width: '25%', height: 10, borderRadius: 4, marginBottom: 10 }} />
                        <div className="skeleton" style={{ width: '85%', height: 16, borderRadius: 4, marginBottom: 8 }} />
                        <div className="skeleton" style={{ width: '70%', height: 12, borderRadius: 4 }} />
                    </div>
                ) : displayedHack ? (
                    <div
                        onClick={() => onSelectUpdate(displayedHack)}
                        style={{
                            background: 'linear-gradient(135deg, rgba(251,146,60,0.1), rgba(251,146,60,0.02))',
                            border: '1px solid rgba(251,146,60,0.3)',
                            borderRadius: 20,
                            padding: '16px',
                            cursor: 'pointer',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{
                                fontFamily: "'Syne', sans-serif",
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: '0.06em',
                                color: 'var(--orange)',
                            }}>{displayedHack.tag}</span>
                            <span style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 10,
                                color: 'var(--text-3)',
                            }}>• {displayedHack.timeAgo}</span>
                        </div>
                        <h3 style={{
                            fontFamily: "'Syne', sans-serif",
                            fontSize: 16,
                            fontWeight: 700,
                            color: 'var(--text-1)',
                            margin: '0 0 8px',
                            lineHeight: 1.3,
                        }}>{displayedHack.title}</h3>
                        <p style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 13,
                            color: 'var(--text-2)',
                            lineHeight: 1.5,
                            margin: 0,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}>{displayedHack.shortSummary}</p>
                    </div>
                ) : null}
            </div>

            {/* Continue Learning */}
            <SectionLabel>📖 CONTINUE LEARNING</SectionLabel>
            <LessonCard
                lesson={topLesson}
                onStartLesson={() => onStartLesson(topLesson)}
            />

            {/* Trending Tools */}
            <SectionLabel>🔥 TRENDING TOOLS</SectionLabel>
            <FilterChips
                chips={['All', 'For Builders', 'For Writers', 'Free']}
                active={toolFilter}
                onSelect={setToolFilter}
            />
            <div style={{
                display: 'flex',
                gap: 12,
                padding: '0 20px',
                overflowX: 'auto',
                marginBottom: 28,
                scrollbarWidth: 'none',
            }}>
                {filteredTools.map((tool) => (
                    <ToolCard
                        key={tool.id}
                        tool={tool}
                        onClick={() => onSelectTool(tool)}
                    />
                ))}
            </div>

            {/* Today's Updates */}
            <SectionLabel>📡 TODAY'S UPDATES {loading ? <span style={{ fontSize: 10, color: 'var(--accent-2)' }}> · fetching live...</span> : (() => {
                const stats = getPipelineStats();
                const counts = (stats?.sourceCounts || {}) as Record<string, number>;
                const active = Object.values(counts).filter(n => n > 0).length; return active > 0 ? <span style={{ fontSize: 10, color: 'var(--text-3)' }}> · {active} sources</span> : null;
            })()}</SectionLabel>
            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {loading ? (
                    // Skeleton cards
                    [1, 2, 3].map(i => (
                        <div key={i} style={{
                            padding: '14px 16px',
                            background: 'var(--surface-2)',
                            border: '1px solid var(--border)',
                            borderRadius: 20,
                            height: 72,
                        }}>
                            <div className="skeleton" style={{ width: '30%', height: 10, borderRadius: 4, marginBottom: 8 }} />
                            <div className="skeleton" style={{ width: '80%', height: 14, borderRadius: 4, marginBottom: 8 }} />
                            <div className="skeleton" style={{ width: '40%', height: 10, borderRadius: 4 }} />
                        </div>
                    ))
                ) : topNews.length === 0 ? (
                    <div style={{
                        padding: '24px 16px',
                        textAlign: 'center',
                        background: 'var(--surface-2)',
                        borderRadius: 20,
                        border: '1px solid var(--border)',
                    }}>
                        <span style={{ fontSize: 28, display: 'block', marginBottom: 8 }}>📡</span>
                        <p style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12,
                            color: 'var(--text-3)',
                            margin: 0,
                            lineHeight: 1.5,
                        }}>No live updates available right now. Check back shortly!</p>
                    </div>
                ) : (
                    topNews.map((item) => (
                        <NewsCard
                            key={item.id}
                            item={item}
                            onClick={() => onSelectUpdate(item)}
                        />
                    ))
                )}
            </div>

            <div style={{ height: 20 }} />
        </div>
    );
}

function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}
