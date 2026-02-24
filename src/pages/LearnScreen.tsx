import React, { useState, useEffect } from 'react';
import { SectionLabel } from '../shared/ui/SectionLabel';
import { LessonCard } from '../features/LessonCard';
import { LessonData } from '../shared/types/types';
import { deltaService } from '../shared/api/deltaService';

interface LearnScreenProps {
    onStartLesson: (lesson: LessonData) => void;
}

const CATEGORIES = [
    { name: 'AI Writing', emoji: '✍️', done: 3, total: 8, color: 'var(--accent-2)' },
    { name: 'AI Images', emoji: '🎨', done: 1, total: 6, color: 'var(--pink)' },
    { name: 'Coding Copilots', emoji: '💻', done: 5, total: 10, color: 'var(--orange)' },
    { name: 'AI Research', emoji: '🔬', done: 2, total: 6, color: 'var(--blue)' },
    { name: 'Video & Audio', emoji: '🎬', done: 0, total: 5, color: 'var(--red)' },
    { name: 'Career & Biz', emoji: '💼', done: 1, total: 4, color: 'var(--green)' },
];

const LEARNING_PATH = {
    title: 'AI-Powered Content Creation',
    steps: ['Basics', 'Prompting', 'Writing', 'Images', 'Workflow'],
    currentStep: 2,
    totalSteps: 5,
    currentLesson: 'Effective AI Prompting',
};

export function LearnScreen({ onStartLesson }: LearnScreenProps) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [quickLessons, setQuickLessons] = useState<LessonData[]>([]);
    const [categoryLessons, setCategoryLessons] = useState<Record<string, LessonData[]>>({});

    const [loadingQuick, setLoadingQuick] = useState(true);
    const [loadingCategory, setLoadingCategory] = useState<Record<string, boolean>>({});

    const path = LEARNING_PATH;

    // Load dynamic "Quick Lessons" on mount
    useEffect(() => {
        let mounted = true;
        async function loadQuickLessons() {
            setLoadingQuick(true);
            try {
                const [lesson1, lesson2] = await Promise.all([
                    deltaService.generateDynamicLesson('Prompt Engineering Fundamentals', 'AI Writing'),
                    deltaService.generateDynamicLesson('AI Workflows for Productivity', 'Career & Biz')
                ]);

                if (!mounted) return;

                const lessons = [];
                if (lesson1) { lesson1.pill = 'QUICK LESSON'; lessons.push(lesson1); }
                if (lesson2) { lesson2.pill = 'QUICK LESSON'; lessons.push(lesson2); }
                setQuickLessons(lessons);
            } catch (e) {
                console.error("Failed to load quick lessons", e);
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

        // If we are selecting a new category and it hasn't been loaded yet
        if (!isCurrentlySelected && !categoryLessons[categoryName] && !loadingCategory[categoryName]) {
            setLoadingCategory(prev => ({ ...prev, [categoryName]: true }));

            try {
                // Generate a lesson dynamically for this category
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

    return (
        <div className="screen-container">
            {/* Status bar */}
            <div style={{ height: 44 }} />

            {/* Header */}
            <div style={{ padding: '8px 20px 20px' }}>
                <h1 style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 24,
                    fontWeight: 800,
                    color: 'var(--text-1)',
                    margin: 0,
                }}>Learn</h1>
                <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    color: 'var(--text-3)',
                    marginTop: 4,
                }}>Your personalised AI learning path</p>
            </div>

            {/* Learning Path Card */}
            <div
                onClick={() => {
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
                    onStartLesson(pathLesson);
                }}
                style={{
                    margin: '0 20px 24px',
                    borderRadius: 28,
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(99,102,241,0.08) 100%)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    padding: '18px 20px',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                }}
            >
                <span style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.12em',
                    color: 'var(--accent-2)',
                }}>YOUR NEXT STEPS</span>
                <h2 style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--text-1)',
                    margin: '8px 0 12px',
                }}>{path.title}</h2>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    {path.steps.map((_, i) => (
                        <div key={i} style={{
                            flex: 1,
                            height: 4,
                            borderRadius: 100,
                            background: i < path.currentStep
                                ? 'var(--accent)'
                                : i === path.currentStep
                                    ? 'var(--accent-bg)'
                                    : 'var(--surface-3)',
                            transition: 'background 0.3s ease',
                        }} />
                    ))}
                </div>
                <span style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    color: 'var(--text-2)',
                }}>
                    Lesson {path.currentStep} of {path.totalSteps} · {path.currentLesson}
                </span>
            </div>

            {/* Categories */}
            <SectionLabel>📚 CATEGORIES</SectionLabel>
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                padding: '0 20px',
                marginBottom: 16,
            }}>
                {CATEGORIES.map((cat) => (
                    <div key={cat.name}
                        onClick={() => handleCategoryClick(cat.name)}
                        style={{
                            background: selectedCategory === cat.name ? 'rgba(99,102,241,0.08)' : 'var(--surface-2)',
                            border: `1px solid ${selectedCategory === cat.name ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
                            borderRadius: 20,
                            padding: '16px 14px',
                            position: 'relative',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            bottom: -20, right: -20,
                            width: 80, height: 80,
                            background: `radial-gradient(circle, ${cat.color}22 0%, transparent 70%)`,
                            borderRadius: '50%',
                        }} />
                        <span style={{ fontSize: 24 }}>{cat.emoji}</span>
                        <div style={{
                            fontFamily: "'Syne', sans-serif",
                            fontSize: 14, fontWeight: 700,
                            color: 'var(--text-1)', marginTop: 8,
                        }}>{cat.name}</div>
                        <div style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 11, color: 'var(--text-3)',
                            marginTop: 2, marginBottom: 8,
                        }}>{cat.done}/{cat.total} done</div>
                        <div style={{
                            height: 3, width: '100%',
                            background: 'var(--surface-3)',
                            borderRadius: 100, overflow: 'hidden',
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${(cat.done / cat.total) * 100}%`,
                                background: cat.color,
                                borderRadius: 100,
                                transition: 'width 0.6s ease',
                            }} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Category Lessons (expandable) */}
            {selectedCategory && (
                <div style={{ padding: '0 0 12px', animation: 'fadeInUp 0.3s ease' }}>
                    <SectionLabel>📖 {selectedCategory.toUpperCase()} LESSONS</SectionLabel>

                    {loadingCategory[selectedCategory] ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 20px' }}>
                            <div style={{ height: 120, background: 'var(--surface-2)', borderRadius: 24, animation: 'pulse 1.5s infinite' }} />
                        </div>
                    ) : categoryLessons[selectedCategory]?.length > 0 ? (
                        categoryLessons[selectedCategory].map((lesson) => (
                            <LessonCard
                                key={lesson.id}
                                lesson={lesson}
                                onStartLesson={() => onStartLesson(lesson)}
                            />
                        ))
                    ) : (
                        <div style={{ padding: '10px 20px', color: 'var(--text-3)', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
                            No lessons generated yet.
                        </div>
                    )}
                </div>
            )}

            {/* Quick Lessons */}
            <SectionLabel>⚡ QUICK LESSONS — 2 MIN OR LESS</SectionLabel>

            {loadingQuick ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 20px' }}>
                    <div style={{ height: 120, background: 'var(--surface-2)', borderRadius: 24, animation: 'pulse 1.5s infinite' }} />
                    <div style={{ height: 120, background: 'var(--surface-2)', borderRadius: 24, animation: 'pulse 1.5s infinite', animationDelay: '0.2s' }} />
                </div>
            ) : quickLessons.length > 0 ? (
                quickLessons.map((lesson) => (
                    <LessonCard
                        key={lesson.id}
                        lesson={lesson}
                        onStartLesson={() => onStartLesson(lesson)}
                    />
                ))
            ) : (
                <div style={{ padding: '10px 20px', color: 'var(--text-3)', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
                    Could not load quick lessons. Please try again.
                </div>
            )}

            <div style={{ height: 20 }} />
        </div>
    );
}
