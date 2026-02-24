import React, { useState } from 'react';
import { ToolData, LessonData } from '../shared/types/types';
import { deltaService } from '../shared/api/deltaService';
import { ArrowLeft, ExternalLink, Play, Star, Zap, BookOpen } from 'lucide-react';

export interface ToolDetailProps {
    tool: ToolData;
    onBack: () => void;
    onStartLesson: (lesson: LessonData) => void;
    onOpenGuide?: (tool: ToolData) => void;
}

const MASTERY_LEVELS = [
    { level: 0, label: 'Not Started', sublabel: 'Tap below to start', icon: '○' },
    { level: 1, label: 'Beginner', sublabel: 'Core features mastered', icon: '◐' },
    { level: 2, label: 'Intermediate', sublabel: 'Advanced workflows', icon: '◑' },
    { level: 3, label: 'Advanced', sublabel: 'Full mastery achieved', icon: '●' },
];

export function ToolDetail({ tool, onBack, onStartLesson, onOpenGuide }: ToolDetailProps) {
    const [generating, setGenerating] = useState(false);

    const handleGenerateLesson = async () => {
        setGenerating(true);
        try {
            const lesson = await deltaService.generateToolLesson(tool);
            if (lesson) {
                onStartLesson(lesson);
            }
        } catch (e) {
            console.error('[ToolDetail] Lesson gen failed:', e);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="screen-container">
            {/* Status bar */}
            <div style={{ height: 44 }} />

            {/* Top bar */}
            <div style={{
                padding: '8px 20px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <button onClick={onBack} style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                }}>
                    <ArrowLeft size={18} color="var(--text-2)" />
                </button>
                <button
                    onClick={() => window.open(tool.url, '_blank')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px', borderRadius: 12,
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                        cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                        fontSize: 12, fontWeight: 500, color: 'var(--text-2)',
                    }}
                >
                    <ExternalLink size={14} />
                    Visit Tool
                </button>
            </div>

            {/* Hero section */}
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '10px 20px 24px',
            }}>
                <div style={{
                    width: 72, height: 72, borderRadius: 20,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 16, overflow: 'hidden',
                }}>
                    <img
                        src={tool.logoUrl}
                        alt={tool.name}
                        style={{ width: 48, height: 48, objectFit: 'contain' }}
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                </div>
                <h1 style={{
                    fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800,
                    color: 'var(--text-1)', margin: 0,
                }}>{tool.name}</h1>
                <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                    color: 'var(--text-3)', marginTop: 4,
                }}>{tool.description}</p>

                {/* Match + Category pills */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 9999,
                        background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)',
                    }}>
                        <Star size={12} color="var(--green)" />
                        <span style={{
                            fontFamily: "'DM Sans', sans-serif", fontSize: 11,
                            fontWeight: 700, color: 'var(--green)',
                        }}>{tool.matchScore}% Match</span>
                    </div>
                    <div style={{
                        padding: '4px 10px', borderRadius: 9999,
                        background: 'var(--surface-3)', border: '1px solid var(--border)',
                    }}>
                        <span style={{
                            fontFamily: "'DM Sans', sans-serif", fontSize: 11,
                            fontWeight: 500, color: 'var(--text-2)',
                        }}>{tool.category}</span>
                    </div>
                    {tool.isNew && (
                        <div style={{
                            padding: '4px 10px', borderRadius: 9999,
                            background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)',
                        }}>
                            <span style={{
                                fontFamily: "'DM Sans', sans-serif", fontSize: 11,
                                fontWeight: 700, color: 'var(--yellow)',
                            }}>NEW</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Delta's Analysis */}
            {tool.deltaAnalysis && (
                <div style={{
                    margin: '0 20px 20px', padding: '16px',
                    background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: 20,
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                    }}>
                        <Zap size={14} color="var(--accent-2)" />
                        <span style={{
                            fontFamily: "'Syne', sans-serif", fontSize: 11,
                            fontWeight: 700, color: 'var(--accent-2)',
                            textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                        }}>DELTA'S TAKE</span>
                    </div>
                    <p style={{
                        fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                        color: 'var(--text-1)', lineHeight: 1.6,
                        fontStyle: 'italic',
                    }}>"{tool.deltaAnalysis}"</p>
                </div>
            )}

            {/* Use Cases */}
            {tool.useCases && tool.useCases.length > 0 && (
                <div style={{ padding: '0 20px', marginBottom: 20 }}>
                    <span style={{
                        fontFamily: "'Syne', sans-serif", fontSize: 10,
                        fontWeight: 700, textTransform: 'uppercase' as const,
                        letterSpacing: '0.12em', color: 'var(--text-3)',
                    }}>USE CASES</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                        {tool.useCases.map((uc, i) => (
                            <div key={i} style={{
                                padding: '6px 12px', borderRadius: 12,
                                background: 'var(--surface-2)', border: '1px solid var(--border)',
                                fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                                color: 'var(--text-2)',
                            }}>{uc}</div>
                        ))}
                    </div>
                </div>
            )}

            {/* Best For */}
            {tool.bestFor && tool.bestFor.length > 0 && (
                <div style={{ padding: '0 20px', marginBottom: 24 }}>
                    <span style={{
                        fontFamily: "'Syne', sans-serif", fontSize: 10,
                        fontWeight: 700, textTransform: 'uppercase' as const,
                        letterSpacing: '0.12em', color: 'var(--text-3)',
                    }}>BEST FOR</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                        {tool.bestFor.map((role, i) => (
                            <div key={i} style={{
                                padding: '6px 12px', borderRadius: 12,
                                background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
                                fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                                fontWeight: 600, color: 'var(--green)',
                            }}>{role}</div>
                        ))}
                    </div>
                </div>
            )}

            {/* Mastery Path */}
            <div style={{ padding: '0 20px', marginBottom: 24 }}>
                <span style={{
                    fontFamily: "'Syne', sans-serif", fontSize: 10,
                    fontWeight: 700, textTransform: 'uppercase' as const,
                    letterSpacing: '0.12em', color: 'var(--text-3)',
                }}>MASTERY PATH</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                    {MASTERY_LEVELS.map((ml) => (
                        <div key={ml.level} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 14px', borderRadius: 16,
                            background: ml.level <= tool.mastery ? 'rgba(99,102,241,0.08)' : 'var(--surface-2)',
                            border: `1px solid ${ml.level <= tool.mastery ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
                        }}>
                            <span style={{
                                fontSize: 18,
                                color: ml.level <= tool.mastery ? 'var(--accent-2)' : 'var(--text-3)',
                            }}>{ml.icon}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                                    fontWeight: 600, color: ml.level <= tool.mastery ? 'var(--text-1)' : 'var(--text-3)',
                                }}>{ml.label}</div>
                                <div style={{
                                    fontFamily: "'DM Sans', sans-serif", fontSize: 11,
                                    color: 'var(--text-3)',
                                }}>{ml.sublabel}</div>
                            </div>
                            {ml.level <= tool.mastery && (
                                <span style={{ fontSize: 14, color: 'var(--green)' }}>✓</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA Button */}
            <div style={{ padding: '0 20px' }}>
                <button
                    onClick={handleGenerateLesson}
                    disabled={generating}
                    style={{
                        width: '100%', padding: '14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        background: generating ? 'var(--surface-3)' : 'var(--accent)',
                        color: '#fff', border: 'none', borderRadius: 14,
                        fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                        fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer',
                    }}
                >
                    {generating ? (
                        <>
                            <div className="animate-pulse-live" style={{
                                width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.6)',
                            }} />
                            Generating lesson...
                        </>
                    ) : (
                        <>
                            <BookOpen size={16} />
                            Start Learning {tool.name}
                        </>
                    )}
                </button>
            </div>

            <div style={{ height: 12 }} />

            {/* Full Guide Button */}
            {onOpenGuide && (
                <div style={{ padding: '0 20px' }}>
                    <button
                        onClick={() => onOpenGuide(tool)}
                        style={{
                            width: '100%', padding: '14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            background: 'rgba(99,102,241,0.08)',
                            color: 'var(--accent-2)', border: '1px solid rgba(99,102,241,0.25)',
                            borderRadius: 14,
                            fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                            fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        📖 View Full Guide
                    </button>
                </div>
            )}

            <div style={{ height: 40 }} />
        </div>
    );
}
