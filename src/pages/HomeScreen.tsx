import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
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
import { colors, radius } from '../shared/platform/theme';

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
            "To build YOUR system prompt, you need to analyze your own writing patterns. Here's the key insight: your writing style has 4 layers — (1) Tone: formal, casual, witty, warm? (2) Sentence structure: short and punchy or flowing and complex? (3) Vocabulary level: everyday words or domain-specific terms? (4) Signature moves: do you use analogies? Questions? Bullet points? Identify these 4 things about yourself.",
            "Try this prompt right now — paste it into Claude or ChatGPT: \"Analyze the following 3 samples of my writing. For each, identify: (1) my tone, (2) my average sentence length, (3) vocabulary complexity, (4) recurring patterns or style signatures. Then create a system prompt that I can use to make AI write in my exact voice. The system prompt should be under 200 words.\"\n\nThen paste 3 examples of your actual writing below (emails, social posts, anything you've written).",
            "Once you have your system prompt, here's the power move: save it in your notes and paste it at the start of every new AI conversation. Even better — if you use ChatGPT, put it in Custom Instructions so it applies automatically. Your AI now writes like YOU, not like a generic bot. Test it by asking: \"Using my writing style, draft a LinkedIn post about [your topic]\" and compare it to what you'd get without the system prompt.",
            'Advanced technique — style transfer: Use your system prompt + a specific role combo. Example: "Use my writing style [your system prompt], but apply the structure of a TED talk: open with a surprising stat, build tension, deliver the insight, end with a call to action." This gets you YOUR voice in THEIR format — the best of both worlds.',
        ],
        practiceTask: 'Create your personal writing system prompt by feeding 3 real writing samples into the prompt from Step 3. Save the result and test it with a real writing task today.',
        taskPrompt: 'Analyze the following 3 samples of my writing.\n\nSample 1:\n[Paste a recent email you wrote]\n\nSample 2:\n[Paste a social media post or message]\n\nSample 3:\n[Paste a paragraph from any document you created]\n\nFor each sample, identify:\n1. Tone (formal/casual/witty/warm/direct)\n2. Average sentence length (short/medium/long)\n3. Vocabulary complexity (simple/moderate/technical)\n4. Recurring patterns (analogies? questions? bullet points? specific phrases?)\n\nThen create a reusable SYSTEM PROMPT (under 200 words) that captures my exact writing voice.',
    };

    useEffect(() => {
        let mounted = true;
        contentPipeline.getUpdates().then(data => {
            if (mounted) { setUpdates(data); setLoading(false); }
        }).catch(() => { if (mounted) setLoading(false); });
        storageService.updateStreak();
        return () => { mounted = false; };
    }, []);

    const topNews = [...updates]
        .map(u => ({ update: u, score: scoreForUser(u, user) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map(s => s.update);

    const filteredTools = toolFilter === 'All'
        ? trendingTools
        : toolFilter === 'For Builders'
            ? trendingTools.filter(t => ['Coding', 'General'].includes(t.category))
            : toolFilter === 'For Writers'
                ? trendingTools.filter(t => ['Writing', 'General'].includes(t.category))
                : toolFilter === 'Free'
                    ? trendingTools
                    : trendingTools;

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

    const stats = getPipelineStats();
    const counts = (stats?.sourceCounts || {}) as Record<string, number>;
    const activeSources = Object.values(counts).filter(n => n > 0).length;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.greeting}>{greeting}, {user.name}</Text>
                    <Text style={styles.subGreeting}>
                        {dayOfWeek} · {loading ? 'Loading updates...' : `${updates.length} updates today`}
                    </Text>
                </View>
                <TouchableOpacity onPress={onProfile} style={styles.avatarBtn}>
                    <Text style={styles.avatarInitials}>{user.initials}</Text>
                </TouchableOpacity>
            </View>

            {/* Streak Bar */}
            <View style={{ marginTop: 16 }}>
                <StreakBar />
            </View>

            {/* Daily AI Hack — always shown: loading skeleton → live hack → static fallback */}
            {(loading || displayedHack) && (
                <>
                    <SectionLabel>💡 DAILY AI HACK</SectionLabel>
                    <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
                        {loading ? (
                            <View style={styles.hackCard}>
                                <View style={[styles.skeleton, { width: '25%', height: 10, marginBottom: 10 }]} />
                                <View style={[styles.skeleton, { width: '85%', height: 16, marginBottom: 8 }]} />
                                <View style={[styles.skeleton, { width: '70%', height: 12 }]} />
                            </View>
                        ) : displayedHack ? (
                            <TouchableOpacity
                                onPress={() => onSelectUpdate(displayedHack)}
                                style={styles.hackCard}
                                activeOpacity={0.85}
                            >
                                <View style={styles.hackMeta}>
                                    <Text style={styles.hackTag}>{displayedHack.tag}</Text>
                                    <Text style={styles.hackTime}>• {displayedHack.timeAgo}</Text>
                                </View>
                                <Text style={styles.hackTitle}>{displayedHack.title}</Text>
                                <Text style={styles.hackSummary} numberOfLines={2}>{displayedHack.shortSummary}</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </>
            )}

            {/* Continue Learning */}
            <SectionLabel>📖 CONTINUE LEARNING</SectionLabel>
            <LessonCard lesson={topLesson} onStartLesson={() => onStartLesson(topLesson)} />

            {/* Trending Tools */}
            <SectionLabel>🔥 TRENDING TOOLS</SectionLabel>
            <FilterChips
                chips={['All', 'For Builders', 'For Writers', 'Free']}
                active={toolFilter}
                onSelect={setToolFilter}
            />
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.toolsScroll}
                style={{ marginBottom: 28 }}
            >
                {filteredTools.map((tool) => (
                    <ToolCard key={tool.id} tool={tool} onClick={() => onSelectTool(tool)} />
                ))}
            </ScrollView>

            {/* Today's Updates */}
            <SectionLabel>
                {`📡 TODAY'S UPDATES${activeSources > 0 ? ` · ${activeSources} sources` : ''}`}
            </SectionLabel>
            <View style={styles.newsList}>
                {loading ? (
                    [1, 2, 3].map(i => (
                        <View key={i} style={styles.skeleton} />
                    ))
                ) : topNews.length === 0 ? (
                    <View style={{ padding: 24, alignItems: 'center', backgroundColor: colors.surface2, borderRadius: 20, borderWidth: 1, borderColor: colors.border }}>
                        <Text style={{ fontSize: 28, marginBottom: 8 }}>📡</Text>
                        <Text style={{ fontSize: 12, color: colors.text3, textAlign: 'center', lineHeight: 18 }}>No live updates available right now. Check back shortly!</Text>
                    </View>
                ) : (
                    topNews.map((item) => (
                        <NewsCard key={item.id} item={item} onClick={() => onSelectUpdate(item)} />
                    ))
                )}
            </View>

            <View style={{ height: 20 }} />
        </ScrollView>
    );
}

function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 4,
    },
    headerLeft: { flex: 1 },
    greeting: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text1,
    },
    subGreeting: {
        fontSize: 13,
        color: colors.text3,
        marginTop: 4,
    },
    avatarBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    avatarInitials: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
    hackCard: {
        backgroundColor: 'rgba(251,146,60,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(251,146,60,0.3)',
        borderRadius: radius.xxl,
        padding: 16,
    },
    hackMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    hackTag: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        color: colors.orange,
        textTransform: 'uppercase',
    },
    hackTime: {
        fontSize: 10,
        color: colors.text3,
    },
    hackTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text1,
        marginBottom: 8,
        lineHeight: 22,
    },
    hackSummary: {
        fontSize: 13,
        color: colors.text2,
        lineHeight: 20,
    },
    toolsScroll: {
        paddingHorizontal: 20,
        gap: 12,
    },
    newsList: {
        paddingHorizontal: 20,
        gap: 10,
    },
    skeleton: {
        height: 72,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.xl,
        marginBottom: 10,
    },
});
