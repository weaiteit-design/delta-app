import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { SectionLabel } from '../shared/ui/SectionLabel';
import { LessonCard } from '../features/LessonCard';
import { LessonData } from '../shared/types/types';
import { deltaService } from '../shared/api/deltaService';
import { getLessons, getRecommendedLessons } from '../shared/api/lessonsService';
import { storageService } from '../entities/user/storageService';
import { colors, radius } from '../shared/platform/theme';

interface LearnScreenProps {
    onStartLesson: (lesson: LessonData) => void;
}

const CATEGORIES = [
    { name: 'AI Writing', emoji: '✍️', done: 3, total: 8, color: colors.accent2 },
    { name: 'AI Images', emoji: '🎨', done: 1, total: 6, color: colors.pink },
    { name: 'Coding Copilots', emoji: '💻', done: 5, total: 10, color: colors.orange },
    { name: 'AI Research', emoji: '🔬', done: 2, total: 6, color: colors.blue },
    { name: 'Video & Audio', emoji: '🎬', done: 0, total: 5, color: colors.red },
    { name: 'Career & Biz', emoji: '💼', done: 1, total: 4, color: colors.green },
];

// Role-based recommended learning paths
const ROLE_PATHS: Record<string, { title: string; steps: string[]; currentStep: number; currentLesson: string }> = {
    'Student': {
        title: 'AI Fundamentals for Students',
        steps: ['AI Basics', 'Research Tools', 'Writing Help', 'Study Hacks', 'Build Projects'],
        currentStep: 0,
        currentLesson: 'Understanding AI Models',
    },
    'Non-Technical Pro': {
        title: 'AI for Business Professionals',
        steps: ['AI Overview', 'Prompting', 'Writing Tools', 'Automation', 'Advanced Workflows'],
        currentStep: 0,
        currentLesson: 'AI Prompting for Non-Technical Users',
    },
    'Technical Pro': {
        title: 'AI Engineering Toolkit',
        steps: ['LLM APIs', 'Coding Copilots', 'RAG Basics', 'Agents', 'Production Deploy'],
        currentStep: 0,
        currentLesson: 'Working with LLM APIs',
    },
    'Founder': {
        title: 'AI Strategy for Founders',
        steps: ['AI Landscape', 'Identify Use Cases', 'Build vs Buy', 'Team Upskilling', 'AI Roadmap'],
        currentStep: 0,
        currentLesson: 'The AI Tool Landscape',
    },
    'Creator & Marketer': {
        title: 'AI-Powered Content Creation',
        steps: ['Basics', 'Prompting', 'Writing', 'Images', 'Workflow'],
        currentStep: 0,
        currentLesson: 'AI Writing Fundamentals',
    },
};

const DEFAULT_PATH = {
    title: 'AI-Powered Content Creation',
    steps: ['Basics', 'Prompting', 'Writing', 'Images', 'Workflow'],
    currentStep: 0,
    currentLesson: 'Effective AI Prompting',
};

function getLearningPath() {
    const user = storageService.getUser();
    const path = ROLE_PATHS[user.role] || DEFAULT_PATH;
    // Advance step based on lessons completed (rough approximation)
    const completedCount = user.completedLessonIds?.length || 0;
    const step = Math.min(Math.floor(completedCount / 2), path.steps.length - 1);
    return { ...path, currentStep: step, totalSteps: path.steps.length };
}

const DIFF_FILTERS = [
    { key: 'all',          label: 'All Levels', emoji: '🌟' },
    { key: 'beginner',     label: 'Beginner',   emoji: '🌱' },
    { key: 'intermediate', label: 'Intermediate', emoji: '⚡' },
    { key: 'advanced',     label: 'Advanced',   emoji: '🔥' },
] as const;

type DiffFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';

function difficultyMatches(lessonDifficulty: number, filter: DiffFilter): boolean {
    if (filter === 'all') return true;
    if (filter === 'beginner') return lessonDifficulty === 1;
    if (filter === 'intermediate') return lessonDifficulty === 2;
    if (filter === 'advanced') return lessonDifficulty === 3;
    return true;
}

export function LearnScreen({ onStartLesson }: LearnScreenProps) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [quickLessons, setQuickLessons] = useState<LessonData[]>([]);
    const [recommendedLessons, setRecommendedLessons] = useState<LessonData[]>([]);
    const [categoryLessons, setCategoryLessons] = useState<Record<string, LessonData[]>>({});
    const [diffFilter, setDiffFilter] = useState<DiffFilter>('all');

    const [loadingQuick, setLoadingQuick] = useState(true);
    const [loadingCategory, setLoadingCategory] = useState<Record<string, boolean>>({});

    const path = getLearningPath();
    const user = storageService.getUser();

    useEffect(() => {
        let mounted = true;
        async function loadQuickLessons() {
            setLoadingQuick(true);
            try {
                // Try DB lessons first (returns [] if Supabase not configured)
                const [dbLessons, recommended] = await Promise.all([
                    getLessons({ limit: 6 }),
                    getRecommendedLessons(),
                ]);

                if (!mounted) return;

                if (dbLessons.length > 0) {
                    setQuickLessons(dbLessons);
                    setRecommendedLessons(recommended);
                    setLoadingQuick(false);
                    return;
                }

                // Fallback: Gemini-generated lessons
                const [lesson1, lesson2] = await Promise.all([
                    deltaService.generateDynamicLesson('Prompt Engineering Fundamentals', 'AI Writing'),
                    deltaService.generateDynamicLesson('AI Workflows for Productivity', 'Career & Biz')
                ]);

                if (!mounted) return;

                const lessons: LessonData[] = [];
                if (lesson1) { lesson1.pill = 'QUICK LESSON'; lessons.push(lesson1); }
                if (lesson2) { lesson2.pill = 'QUICK LESSON'; lessons.push(lesson2); }
                setQuickLessons(lessons);
            } catch (e) {
                console.error('Failed to load quick lessons', e);
            } finally {
                if (mounted) setLoadingQuick(false);
            }
        }
        loadQuickLessons();
        return () => { mounted = false; };
    }, []);

    const handleCategoryClick = async (categoryName: string) => {
        const isCurrentlySelected = selectedCategory === categoryName;
        setSelectedCategory(isCurrentlySelected ? null : categoryName);

        if (!isCurrentlySelected && !categoryLessons[categoryName] && !loadingCategory[categoryName]) {
            setLoadingCategory(prev => ({ ...prev, [categoryName]: true }));

            try {
                const lesson1 = await deltaService.generateDynamicLesson(`Advanced Techniques in ${categoryName}`, categoryName);

                if (lesson1) {
                    setCategoryLessons(prev => ({
                        ...prev,
                        [categoryName]: [lesson1]
                    }));
                }
            } catch (e) {
                console.error(`Failed to load lessons for ${categoryName}`, e);
            } finally {
                setLoadingCategory(prev => ({ ...prev, [categoryName]: false }));
            }
        }
    };

    const pathLesson: LessonData = {
        id: 'path-prompting',
        title: 'Effective AI Prompting',
        category: 'AI Writing',
        duration: '3 min',
        xp: 50,
        difficulty: 2,
        preview: 'Learn the prompting techniques that separate beginners from power users.',
        pill: 'LEARNING PATH',
        steps: [
            'The #1 mistake: being too vague. "Write me an email" vs "Write a follow-up email to a client who attended our demo yesterday. Tone: warm but professional. Length: under 100 words."',
            'Use role-based prompting: "You are a senior data analyst at a Fortune 500 company..." — this dramatically improves output quality.',
            'Chain-of-thought: ask the AI to "think step by step" before giving its answer. This catches errors and improves reasoning.',
            'Few-shot learning: provide 2-3 examples of the output you want. The AI pattern-matches better than following instructions alone.',
            'Iteration is key: never accept the first output. Ask "can you make this more concise?" or "rewrite this with more specific examples".',
        ],
        practiceTask: 'Take a prompt you used recently and apply all 5 techniques to create a dramatically improved version',
        taskPrompt: 'You are a senior analyst. Think step-by-step to address the following problem. Requirements: 1. Keep it structured. 2. Use bullet points.',
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Status bar */}
            <View style={{ height: 44 }} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Learn</Text>
                <Text style={styles.headerSubtitle}>
                    {user.role ? `Personalised for ${user.role}s` : 'Your personalised AI learning path'}
                </Text>
            </View>

            {/* Difficulty Filter Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.diffFilters}
            >
                {DIFF_FILTERS.map(f => (
                    <TouchableOpacity
                        key={f.key}
                        onPress={() => setDiffFilter(f.key as DiffFilter)}
                        style={[styles.diffChip, diffFilter === f.key && styles.diffChipActive]}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.diffChipEmoji}>{f.emoji}</Text>
                        <Text style={[styles.diffChipText, diffFilter === f.key && styles.diffChipTextActive]}>
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Learning Path Card */}
            <TouchableOpacity
                onPress={() => onStartLesson(pathLesson)}
                style={styles.pathCard}
                activeOpacity={0.85}
            >
                <Text style={styles.pathCardLabel}>YOUR NEXT STEPS</Text>
                <Text style={styles.pathCardTitle}>{path.title}</Text>
                <View style={styles.progressBarRow}>
                    {path.steps.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.progressSegment,
                                {
                                    backgroundColor: i < path.currentStep
                                        ? colors.accent
                                        : i === path.currentStep
                                            ? colors.accentBg
                                            : colors.surface3,
                                },
                            ]}
                        />
                    ))}
                </View>
                <Text style={styles.pathCardMeta}>
                    Lesson {path.currentStep} of {path.totalSteps} · {path.currentLesson}
                </Text>
            </TouchableOpacity>

            {/* Categories */}
            <SectionLabel>📚 CATEGORIES</SectionLabel>
            <View style={styles.categoriesGrid}>
                {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                        key={cat.name}
                        onPress={() => handleCategoryClick(cat.name)}
                        style={[
                            styles.categoryCard,
                            selectedCategory === cat.name && styles.categoryCardSelected,
                        ]}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                        <Text style={styles.categoryName}>{cat.name}</Text>
                        <Text style={styles.categoryProgress}>{cat.done}/{cat.total} done</Text>
                        <View style={styles.categoryProgressBar}>
                            <View
                                style={[
                                    styles.categoryProgressFill,
                                    {
                                        width: `${(cat.done / cat.total) * 100}%` as any,
                                        backgroundColor: cat.color,
                                    },
                                ]}
                            />
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Category Lessons (expandable) */}
            {selectedCategory && (
                <View style={styles.categoryLessonsSection}>
                    <SectionLabel>📖 {selectedCategory.toUpperCase()} LESSONS</SectionLabel>

                    {loadingCategory[selectedCategory] ? (
                        <View style={styles.skeletonContainer}>
                            <View style={styles.skeletonCard} />
                        </View>
                    ) : categoryLessons[selectedCategory]?.length > 0 ? (
                        categoryLessons[selectedCategory].map((lesson) => (
                            <LessonCard
                                key={lesson.id}
                                lesson={lesson}
                                onStartLesson={() => onStartLesson(lesson)}
                            />
                        ))
                    ) : (
                        <Text style={styles.emptyText}>No lessons generated yet.</Text>
                    )}
                </View>
            )}

            {/* Recommended for You (DB only) */}
            {recommendedLessons.length > 0 && (
                <>
                    <SectionLabel>🎯 RECOMMENDED FOR YOU</SectionLabel>
                    {recommendedLessons.filter(l => difficultyMatches(l.difficulty, diffFilter)).slice(0, 3).map(lesson => (
                        <LessonCard
                            key={lesson.id}
                            lesson={lesson}
                            onStartLesson={() => onStartLesson(lesson)}
                        />
                    ))}
                </>
            )}

            {/* Quick Lessons */}
            <SectionLabel>⚡ QUICK LESSONS — 2 MIN OR LESS</SectionLabel>

            {diffFilter !== 'all' && (
                <View style={styles.encourageRow}>
                    <Text style={styles.encourageText}>
                        {diffFilter === 'beginner' && 'Perfect starting point — no experience needed!'}
                        {diffFilter === 'intermediate' && 'Level up your skills with these focused lessons.'}
                        {diffFilter === 'advanced' && 'Expert-level techniques for serious practitioners.'}
                    </Text>
                </View>
            )}

            {loadingQuick ? (
                <View style={styles.skeletonContainer}>
                    <View style={styles.skeletonCard} />
                    <View style={styles.skeletonCard} />
                </View>
            ) : quickLessons.filter(l => difficultyMatches(l.difficulty, diffFilter)).length > 0 ? (
                quickLessons.filter(l => difficultyMatches(l.difficulty, diffFilter)).map((lesson) => (
                    <LessonCard
                        key={lesson.id}
                        lesson={lesson}
                        onStartLesson={() => onStartLesson(lesson)}
                    />
                ))
            ) : (
                <Text style={styles.emptyText}>
                    {diffFilter !== 'all'
                        ? `No ${diffFilter} lessons loaded yet — try "All Levels".`
                        : 'Could not load quick lessons. Please try again.'}
                </Text>
            )}

            <View style={{ height: 20 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text1,
    },
    headerSubtitle: {
        fontSize: 13,
        color: colors.text3,
        marginTop: 4,
    },
    pathCard: {
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 28,
        backgroundColor: colors.accentBg,
        borderWidth: 1,
        borderColor: 'rgba(99,102,241,0.3)',
        padding: 18,
        paddingHorizontal: 20,
    },
    pathCardLabel: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        color: colors.accent2,
    },
    pathCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text1,
        marginTop: 8,
        marginBottom: 12,
    },
    progressBarRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 10,
    },
    progressSegment: {
        flex: 1,
        height: 4,
        borderRadius: 100,
    },
    pathCardMeta: {
        fontSize: 12,
        color: colors.text2,
    },
    categoriesGrid: {
        paddingHorizontal: 20,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
    },
    categoryCard: {
        width: '48%',
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 20,
        padding: 16,
        paddingHorizontal: 14,
        overflow: 'hidden',
    },
    categoryCardSelected: {
        backgroundColor: colors.accentBg,
        borderColor: 'rgba(99,102,241,0.3)',
    },
    categoryEmoji: {
        fontSize: 24,
    },
    categoryName: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text1,
        marginTop: 8,
    },
    categoryProgress: {
        fontSize: 11,
        color: colors.text3,
        marginTop: 2,
        marginBottom: 8,
    },
    categoryProgressBar: {
        height: 3,
        width: '100%',
        backgroundColor: colors.surface3,
        borderRadius: 100,
        overflow: 'hidden',
    },
    categoryProgressFill: {
        height: '100%',
        borderRadius: 100,
    },
    categoryLessonsSection: {
        paddingBottom: 12,
    },
    skeletonContainer: {
        gap: 12,
        paddingHorizontal: 20,
    },
    skeletonCard: {
        height: 120,
        backgroundColor: colors.surface2,
        borderRadius: 24,
        opacity: 0.7,
    },
    emptyText: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        color: colors.text3,
        fontSize: 13,
    },
    diffFilters: {
        paddingHorizontal: 20,
        paddingBottom: 16,
        gap: 8,
        flexDirection: 'row',
    },
    diffChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 7,
        paddingHorizontal: 14,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.full,
    },
    diffChipActive: {
        backgroundColor: 'rgba(99,102,241,0.15)',
        borderColor: 'rgba(99,102,241,0.4)',
    },
    diffChipEmoji: {
        fontSize: 13,
    },
    diffChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text3,
    },
    diffChipTextActive: {
        color: colors.accent2,
    },
    encourageRow: {
        marginHorizontal: 20,
        marginBottom: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: 'rgba(99,102,241,0.08)',
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(99,102,241,0.18)',
    },
    encourageText: {
        fontSize: 12,
        color: colors.accent2,
        lineHeight: 18,
    },
});
