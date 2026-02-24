import React, { useState } from 'react';
import { VerifiedUpdate, LessonData } from '../shared/types/types';
import { deltaService } from '../shared/api/deltaService';
import { ArrowLeft, ExternalLink, BookOpen, Bookmark, Clock, Globe } from 'lucide-react';
import { FomoScore } from '../shared/ui/FomoScore';

interface ArticleReaderProps {
    article: VerifiedUpdate;
    onBack: () => void;
    onStartLesson: (lesson: LessonData) => void;
}

export function ArticleReader({ article, onBack, onStartLesson }: ArticleReaderProps) {
    const [generating, setGenerating] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleGenerateLesson = async () => {
        setGenerating(true);
        try {
            const lesson = await deltaService.generateLesson(article);
            if (lesson) {
                onStartLesson(lesson);
            }
        } catch (e) {
            console.error('[ArticleReader] Lesson gen failed:', e);
        } finally {
            setGenerating(false);
        }
    };

    const typeConfig: Record<string, { color: string; bg: string; border: string }> = {
        'capability': { color: 'var(--red)', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)' },
        'new-tool': { color: 'var(--green)', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)' },
        'workflow': { color: 'var(--blue)', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.3)' },
        'tool-update': { color: 'var(--accent-2)', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.3)' },
        'trick': { color: 'var(--orange)', bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.3)' },
    };

    const config = typeConfig[article.type] || typeConfig['tool-update'];

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
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={() => setSaved(!saved)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '8px 12px', borderRadius: 12,
                            background: saved ? 'rgba(251,191,36,0.12)' : 'var(--surface-2)',
                            border: `1px solid ${saved ? 'rgba(251,191,36,0.3)' : 'var(--border)'}`,
                            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12, fontWeight: 500,
                            color: saved ? 'var(--yellow)' : 'var(--text-2)',
                        }}
                    >
                        <Bookmark size={14} fill={saved ? 'var(--yellow)' : 'none'} />
                        {saved ? 'Saved' : 'Save'}
                    </button>
                    <button
                        onClick={() => article.url && window.open(article.url, '_blank')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '8px 12px', borderRadius: 12,
                            background: 'var(--surface-2)', border: '1px solid var(--border)',
                            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12, fontWeight: 500, color: 'var(--text-2)',
                        }}
                    >
                        <ExternalLink size={14} />
                        Source
                    </button>
                </div>
            </div>

            {/* Hero gradient */}
            <div style={{
                margin: '0 20px', height: 100, borderRadius: 20,
                background: 'linear-gradient(135deg, #1a0a1e 0%, #0f1a2e 40%, #0a1628 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden', marginBottom: 20,
            }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, transparent 70%)',
                }} />
                <span style={{ fontSize: 48, position: 'relative', zIndex: 1 }}>{article.emoji || '⚡'}</span>
            </div>

            {/* Tag + FOMO Score */}
            <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                    padding: '4px 10px', borderRadius: 9999,
                    background: config.bg, border: `1px solid ${config.border}`,
                }}>
                    <span style={{
                        fontFamily: "'Syne', sans-serif", fontSize: 10,
                        fontWeight: 700, textTransform: 'uppercase' as const,
                        letterSpacing: '0.08em', color: config.color,
                    }}>{article.tag}</span>
                </div>
                <FomoScore score={article.fomoScore} />
            </div>

            {/* Title */}
            <div style={{ padding: '0 20px' }}>
                <h1 style={{
                    fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800,
                    color: 'var(--text-1)', margin: 0, lineHeight: 1.3,
                }}>{article.title}</h1>
            </div>

            {/* Meta row */}
            <div style={{
                padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Globe size={12} color="var(--text-3)" />
                    <span style={{
                        fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                        color: 'var(--text-3)',
                    }}>{article.source}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} color="var(--text-3)" />
                    <span style={{
                        fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                        color: 'var(--text-3)',
                    }}>{article.timeAgo}</span>
                </div>
            </div>

            {/* Summary */}
            <div style={{
                margin: '8px 20px 24px', padding: '16px',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 20,
            }}>
                <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                    color: 'var(--text-1)', lineHeight: 1.7,
                }}>{article.shortSummary}</p>
            </div>

            {/* Generate Lesson CTA */}
            <div style={{ padding: '0 20px', marginBottom: 12 }}>
                <button
                    onClick={handleGenerateLesson}
                    disabled={generating}
                    style={{
                        width: '100%', padding: '14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        background: generating ? 'var(--surface-3)' : 'linear-gradient(135deg, var(--accent), var(--accent-2))',
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
                            Learn More — Generate Micro-Lesson
                        </>
                    )}
                </button>
            </div>

            {/* Open Source */}
            <div style={{ padding: '0 20px' }}>
                <button
                    onClick={() => article.url && window.open(article.url, '_blank')}
                    style={{
                        width: '100%', padding: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        background: 'transparent', color: 'var(--text-2)',
                        border: '1px solid var(--border)', borderRadius: 14,
                        fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                        fontWeight: 500, cursor: 'pointer',
                    }}
                >
                    <ExternalLink size={14} />
                    Read Full Article at {article.sourceDomain || 'Source'}
                </button>
            </div>

            <div style={{ height: 40 }} />
        </div>
    );
}
