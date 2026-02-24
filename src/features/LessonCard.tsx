import React, { useState } from 'react';
import { Clock, Play } from 'lucide-react';

interface LessonCardLesson {
    id: string;
    title: string;
    duration: string;
    xp: number;
    difficulty: number;
    preview: string;
    pill: string;
}

interface LessonCardProps {
    lesson: LessonCardLesson;
    onStartLesson?: () => void;
}

export function LessonCard({ lesson, onStartLesson }: LessonCardProps) {
    const [pressed, setPressed] = useState(false);

    return (
        <div
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            onMouseLeave={() => setPressed(false)}
            style={{
                margin: '0 20px 16px',
                borderRadius: 28,
                border: '1px solid var(--border-2)',
                overflow: 'hidden',
                cursor: 'pointer',
                transform: pressed ? 'scale(0.98)' : 'scale(1)',
                transition: 'transform 0.15s ease',
            }}
        >
            {/* Header Zone */}
            <div style={{
                height: 120,
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Radial glow */}
                <div style={{
                    position: 'absolute',
                    top: -40,
                    right: -40,
                    width: 160,
                    height: 160,
                    background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
                    borderRadius: '50%',
                }} />

                {/* Pill */}
                <div style={{
                    alignSelf: 'flex-start',
                    background: 'rgba(99,102,241,0.2)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: 20,
                    padding: '3px 10px',
                }}>
                    <span style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--accent-2)',
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.05em',
                    }}>
                        {lesson.pill}
                    </span>
                </div>

                {/* Title */}
                <div>
                    <div style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 17,
                        fontWeight: 700,
                        color: '#fff',
                        lineHeight: 1.3,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                        overflow: 'hidden',
                        marginBottom: 6,
                    }}>
                        {lesson.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={12} color="rgba(255,255,255,0.5)" />
                            <span style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 11,
                                color: 'rgba(255,255,255,0.5)',
                            }}>{lesson.duration}</span>
                        </div>
                        <div style={{
                            background: 'var(--yellow-bg)',
                            borderRadius: 10,
                            padding: '1px 7px',
                        }}>
                            <span style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 11,
                                fontWeight: 700,
                                color: 'var(--yellow)',
                            }}>+{lesson.xp} XP</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Body Zone */}
            <div style={{
                padding: '14px 18px 16px',
                background: 'var(--surface)',
            }}>
                <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    color: 'var(--text-2)',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical' as const,
                    overflow: 'hidden',
                    marginBottom: 14,
                }}>
                    {lesson.preview}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onStartLesson?.();
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            background: 'var(--accent)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 14,
                            padding: '8px 16px',
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'opacity 0.2s',
                        }}>
                        <Play size={14} fill="#fff" />
                        Start Lesson
                    </button>
                    <div style={{ display: 'flex', gap: 5 }}>
                        {[1, 2, 3].map((dot) => (
                            <div key={dot} style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: dot <= lesson.difficulty ? 'var(--accent-2)' : 'var(--surface-3)',
                            }} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
