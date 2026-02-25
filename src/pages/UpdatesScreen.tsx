import React, { useState, useEffect } from 'react';
import { contentPipeline, scoreForUser } from '../entities/news/contentPipeline';
import { deltaService } from '../shared/api/deltaService';
import { storageService } from '../entities/user/storageService';
import { VerifiedUpdate, LessonData } from '../shared/types/types';
import { getPipelineStats } from '../entities/news/contentCache';
import { SectionLabel } from '../shared/ui/SectionLabel';
import { FilterChips } from '../shared/ui/FilterChips';
import { NewsCard } from '../features/NewsCard';
import { FomoScore } from '../shared/ui/FomoScore';
import { Play, Bookmark, BookOpen } from 'lucide-react';

interface UpdatesScreenProps {
    onSelectUpdate: (update: VerifiedUpdate) => void;
    onStartLesson: (lesson: LessonData) => void;
}

// Colour per update type
function typeColor(type: VerifiedUpdate['type']): string {
    if (type === 'trick') return 'var(--orange)';
    if (type === 'workflow') return 'var(--blue)';
    if (type === 'new-tool') return 'var(--green)';
    if (type === 'capability') return 'var(--red)';
    return 'var(--accent-2)';
}

export function UpdatesScreen({ onSelectUpdate, onStartLesson }: UpdatesScreenProps) {
    const [typeFilter, setTypeFilter] = useState('All');
    const [updates, setUpdates] = useState<VerifiedUpdate[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingLesson, setGeneratingLesson] = useState<string | null>(null);
    // Saved IDs — initialised from storageService so it persists across screens
    const [savedIds, setSavedIds] = useState<Set<string>>(
        () => new Set(storageService.getUser().savedArticleIds)
    );

    const user = storageService.getUser();

    useEffect(() => {
        let mounted = true;
        contentPipeline.getUpdates().then(data => {
            if (mounted) { setUpdates(data); setLoading(false); }
        }).catch(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, []);

    const toggleSave = (id: string) => {
        storageService.toggleArticleSave(id);
        setSavedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleLesson = async (item: VerifiedUpdate) => {
        if (generatingLesson) return;
        setGeneratingLesson(item.id);
        try {
            const lesson = await deltaService.generateLesson(item);
            if (lesson) onStartLesson(lesson);
        } catch (e) {
            console.error('[Updates] Lesson gen failed:', e);
        } finally {
            setGeneratingLesson(null);
        }
    };

    // Pipeline health stats
    const stats = getPipelineStats();
    const activeSources = Object.values(stats?.sourceCounts || {}).filter(n => n > 0).length;
    const totalSources = Math.max(Object.keys(stats?.sourceCounts || {}).length, 7);

    // Apply type filter to an array of updates
    const applyTypeFilter = (items: VerifiedUpdate[]) => {
        if (typeFilter === 'All') return items;
        if (typeFilter === '💡 Tricks') return items.filter(u => u.type === 'trick');
        if (typeFilter === '🔄 Workflows') return items.filter(u => u.type === 'workflow');
        if (typeFilter === '🆕 New Tools') return items.filter(u => u.type === 'new-tool');
        if (typeFilter === '🧠 Capabilities') return items.filter(u => u.type === 'capability');
        if (typeFilter === '🔧 Tool Updates') return items.filter(u => u.type === 'tool-update');
        return items;
    };

    // ---- FOR YOU: sorted by personalized relevance score ----
    const forYouAll = [...updates]
        .map(u => ({ ...u, userScore: scoreForUser(u, user) }))
        .sort((a, b) => (b.userScore ?? 0) - (a.userScore ?? 0));
    const forYouFiltered = applyTypeFilter(forYouAll);
    const forYouHero = forYouFiltered[0] ?? null;
    const forYouRest = forYouFiltered.slice(1, 6); // show 5 more below the hero

    // ---- ALL UPDATES: sorted by FOMO score then recency (no personalization) ----
    const allUpdatesFiltered = applyTypeFilter(
        [...updates].sort((a, b) => {
            if (b.fomoScore !== a.fomoScore) return b.fomoScore - a.fomoScore;
            return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        })
    );

    const SkeletonCard = () => (
        <div style={{
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
    );

    const EmptyState = ({ message }: { message: string }) => (
        <div style={{
            padding: '28px 16px',
            textAlign: 'center',
            background: 'var(--surface-2)',
            borderRadius: 20,
            border: '1px solid var(--border)',
        }}>
            <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>📡</span>
            <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                color: 'var(--text-3)',
                lineHeight: 1.5,
                margin: 0,
            }}>{message}</p>
        </div>
    );

    return (
        <div className="screen-container">
            {/* Status bar */}
            <div style={{ height: 44 }} />

            {/* Header */}
            <div style={{
                padding: '8px 20px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div>
                    <h1 style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 24,
                        fontWeight: 800,
                        color: 'var(--text-1)',
                        margin: 0,
                    }}>Updates</h1>
                    <p style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 12,
                        color: 'var(--text-3)',
                        marginTop: 2,
                    }}>Personalised for {user.role}</p>
                </div>
                {/* Pipeline source indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        border: `1px solid ${stats.cacheHit ? 'rgba(96,165,250,0.4)' : 'rgba(52,211,153,0.4)'}`,
                        borderRadius: 20,
                        padding: '3px 10px',
                    }}>
                        <div className={loading ? 'animate-pulse-live' : ''} style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: stats.cacheHit ? 'var(--primary)' : 'var(--green)',
                        }} />
                        <span style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 10, fontWeight: 600,
                            color: stats.cacheHit ? 'var(--primary)' : 'var(--green)',
                        }}>{stats.cacheHit ? 'Cached' : loading ? 'Fetching...' : 'Live'}</span>
                    </div>
                    {activeSources > 0 && (
                        <div style={{
                            border: '1px solid var(--border)', borderRadius: 20, padding: '3px 10px',
                        }}>
                            <span style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 10, fontWeight: 600, color: 'var(--text-3)',
                            }}>{activeSources}/{totalSources} src</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Type filter chips — controls both sections */}
            <FilterChips
                chips={['All', '💡 Tricks', '🔄 Workflows', '🆕 New Tools', '🧠 Capabilities', '🔧 Tool Updates']}
                active={typeFilter}
                onSelect={setTypeFilter}
            />

            {/* ═══════════════════════════════════════════════ */}
            {/* SECTION 1: FOR YOU — personalized by userScore  */}
            {/* ═══════════════════════════════════════════════ */}
            <SectionLabel>⚡ FOR YOU · {user.role}</SectionLabel>

            {/* Hero card — highest relevance item */}
            <div style={{ padding: '0 20px', marginBottom: 16 }}>
                {loading ? (
                    <div style={{
                        borderRadius: 28, border: '1px solid var(--border-2)',
                        background: 'var(--surface)', height: 230,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <div style={{
                            fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--text-3)',
                            display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                            <div className="animate-pulse-live" style={{
                                width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)',
                            }} />
                            Fetching live AI news...
                        </div>
                    </div>
                ) : forYouHero ? (
                    <div
                        onClick={() => onSelectUpdate(forYouHero)}
                        style={{
                            borderRadius: 28, border: '1px solid var(--border-2)',
                            overflow: 'hidden', background: 'var(--surface)',
                            cursor: 'pointer', transition: 'transform 0.15s ease',
                        }}
                    >
                        {/* Gradient banner */}
                        <div style={{
                            height: 90, position: 'relative',
                            background: 'linear-gradient(135deg, #1a0a1e 0%, #0f1a2e 40%, #0a1628 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, transparent 70%)',
                            }} />
                            <span style={{ fontSize: 40, position: 'relative', zIndex: 1 }}>
                                {forYouHero.emoji || '🚀'}
                            </span>
                            {/* Personalized badge */}
                            <div style={{
                                position: 'absolute', top: 10, right: 12,
                                background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.4)',
                                borderRadius: 20, padding: '3px 9px',
                            }}>
                                <span style={{
                                    fontFamily: "'Syne', sans-serif", fontSize: 9, fontWeight: 700,
                                    color: 'var(--accent-2)', letterSpacing: '0.08em',
                                }}>TOP PICK FOR YOU</span>
                            </div>
                        </div>
                        <div style={{ padding: '14px 16px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{
                                    fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700,
                                    letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                                    color: typeColor(forYouHero.type),
                                }}>{forYouHero.tag}</span>
                                <FomoScore score={forYouHero.fomoScore} />
                                <span style={{
                                    fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: 'var(--text-3)',
                                }}>· {forYouHero.timeAgo}</span>
                            </div>
                            <h2 style={{
                                fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700,
                                color: 'var(--text-1)', lineHeight: 1.3, margin: '0 0 6px',
                            }}>{forYouHero.title}</h2>
                            <p style={{
                                fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--text-2)',
                                lineHeight: 1.5, margin: '0 0 12px',
                                display: '-webkit-box', WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                            }}>{forYouHero.shortSummary}</p>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onSelectUpdate(forYouHero); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 5,
                                        background: 'var(--accent)', color: '#fff', border: 'none',
                                        borderRadius: 12, padding: '8px 14px',
                                        fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
                                        cursor: 'pointer',
                                    }}>
                                    <Play size={12} fill="#fff" />
                                    Read
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleLesson(forYouHero); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 5,
                                        background: 'transparent', border: '1px solid var(--border-2)',
                                        borderRadius: 12, padding: '8px 14px',
                                        fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500,
                                        color: generatingLesson === forYouHero.id ? 'var(--text-3)' : 'var(--accent-2)',
                                        cursor: generatingLesson ? 'not-allowed' : 'pointer',
                                    }}>
                                    <BookOpen size={12} />
                                    {generatingLesson === forYouHero.id ? 'Generating...' : 'Learn'}
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleSave(forYouHero.id); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 5,
                                        background: 'transparent', borderRadius: 12, padding: '8px 12px',
                                        border: `1px solid ${savedIds.has(forYouHero.id) ? 'rgba(251,191,36,0.4)' : 'var(--border-2)'}`,
                                        color: savedIds.has(forYouHero.id) ? 'var(--yellow)' : 'var(--text-2)',
                                        fontFamily: "'DM Sans', sans-serif", fontSize: 12, cursor: 'pointer',
                                    }}>
                                    <Bookmark size={12} fill={savedIds.has(forYouHero.id) ? 'var(--yellow)' : 'none'} />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <EmptyState message={
                        typeFilter !== 'All'
                            ? `No personalised ${typeFilter.replace(/[^\w\s]/g, '').trim()} found. Try "All" to see everything.`
                            : 'No updates yet — check back shortly!'
                    } />
                )}
            </div>

            {/* More personalised items */}
            {!loading && forYouRest.length > 0 && (
                <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                    {forYouRest.map(item => (
                        <NewsCard
                            key={item.id}
                            item={item}
                            onClick={() => onSelectUpdate(item)}
                        />
                    ))}
                </div>
            )}
            {loading && (
                <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                    {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* SECTION 2: ALL UPDATES — complete general feed  */}
            {/* ═══════════════════════════════════════════════ */}
            <SectionLabel>
                📡 ALL UPDATES
                {!loading && (
                    <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 400 }}>
                        {' '}· {allUpdatesFiltered.length} items · sorted by impact
                    </span>
                )}
            </SectionLabel>

            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {loading ? (
                    [1, 2, 3, 4].map(i => <SkeletonCard key={i} />)
                ) : allUpdatesFiltered.length === 0 ? (
                    <EmptyState message={
                        typeFilter !== 'All'
                            ? `No ${typeFilter.replace(/[^\w\s]/g, '').trim()} in the feed right now.`
                            : 'No updates yet — sources are loading. Check back shortly!'
                    } />
                ) : (
                    allUpdatesFiltered.map(item => (
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
