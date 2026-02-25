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
import { Play, Bookmark, BookOpen, RefreshCw } from 'lucide-react';

interface UpdatesScreenProps {
    onSelectUpdate: (update: VerifiedUpdate) => void;
    onStartLesson: (lesson: LessonData) => void;
}

export function UpdatesScreen({ onSelectUpdate, onStartLesson }: UpdatesScreenProps) {
    const [filter, setFilter] = useState('⚡ For You');
    const [updates, setUpdates] = useState<VerifiedUpdate[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [generatingLesson, setGeneratingLesson] = useState(false);
    const [saved, setSaved] = useState(false);

    const user = storageService.getUser();

    useEffect(() => {
        let mounted = true;
        contentPipeline.getUpdates().then(data => {
            if (mounted) { setUpdates(data); setLoading(false); }
        }).catch(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, []);

    // Pipeline health stats
    const stats = getPipelineStats();
    const activeSources = Object.values(stats?.sourceCounts || {}).filter(n => n > 0).length;
    const totalSources = Math.max(Object.keys(stats?.sourceCounts || {}).length, 6);

    // Personalised scoring
    const scoredUpdates = updates.map(u => ({
        update: u,
        relevance: scoreForUser(u, user),
    }));

    const hero = updates.length > 0 ? updates[0] : null;

    // If we only have a few highly-filtered items, don't slice off the hero for the lists.
    // Otherwise the user sees a mostly blank screen.
    const rest = updates.length <= 3 ? updates : updates.slice(1);

    const filtered = (() => {
        if (filter === '⚡ For You') {
            // Sort all items by user relevance (since the pipeline already filtered for high quality)
            // If we have <= 3 items total, don't exclude the hero from the list
            const baseList = scoredUpdates.length <= 3
                ? scoredUpdates
                : scoredUpdates.filter(s => s.update.id !== hero?.id);

            return baseList
                .sort((a, b) => b.relevance - a.relevance)
                .map(s => s.update);
        }
        if (filter === 'All') return rest;
        return rest.filter(n => {
            if (filter === '💡 Tricks') return n.type === 'trick';
            if (filter === '🔄 Workflows') return n.type === 'workflow';
            if (filter === '🆕 New Tools') return n.type === 'new-tool';
            if (filter === '🧠 Capabilities') return n.type === 'capability';
            if (filter === '🔧 Tool Updates') return n.type === 'tool-update';
            return true;
        });
    })();

    const handleRefresh = async () => {
        if (refreshing) return;
        setRefreshing(true);
        setLoading(true);
        try {
            const data = await contentPipeline.forceRefresh();
            setUpdates(data);
        } catch {
            // silently fail — keep existing updates
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleHeroLesson = async () => {
        if (!hero || generatingLesson) return;
        setGeneratingLesson(true);
        try {
            const lesson = await deltaService.generateLesson(hero);
            if (lesson) onStartLesson(lesson);
        } catch (e) {
            console.error('[Updates] Lesson gen failed:', e);
        } finally {
            setGeneratingLesson(false);
        }
    };

    return (
        <div className="screen-container">
            {/* Status bar */}
            <div style={{ height: 44 }} />

            {/* Header */}
            <div style={{
                padding: '8px 20px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <h1 style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 24,
                    fontWeight: 800,
                    color: 'var(--text-1)',
                    margin: 0,
                }}>Updates</h1>
                {/* Refresh + pipeline source indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 30,
                            height: 30,
                            border: '1px solid var(--border)',
                            borderRadius: '50%',
                            background: 'transparent',
                            cursor: refreshing ? 'not-allowed' : 'pointer',
                            color: 'var(--text-3)',
                            padding: 0,
                            transition: 'color 0.2s',
                        }}>
                        <RefreshCw
                            size={14}
                            style={{
                                animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
                            }}
                        />
                    </button>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        border: `1px solid ${stats.cacheHit ? 'rgba(96,165,250,0.4)' : 'rgba(52,211,153,0.4)'}`,
                        borderRadius: 20,
                        padding: '3px 10px',
                    }}>
                        <div className={loading ? 'animate-pulse-live' : ''} style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: stats.cacheHit ? 'var(--primary)' : 'var(--green)',
                        }} />
                        <span style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 10,
                            fontWeight: 600,
                            color: stats.cacheHit ? 'var(--primary)' : 'var(--green)',
                        }}>{stats.cacheHit ? 'Cached' : loading ? 'Fetching...' : 'Live'}</span>
                    </div>
                    {activeSources > 0 && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            border: '1px solid var(--border)',
                            borderRadius: 20,
                            padding: '3px 10px',
                        }}>
                            <span style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 10,
                                fontWeight: 600,
                                color: 'var(--text-3)',
                            }}>{activeSources}/{totalSources} sources</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Filter chips */}
            <FilterChips
                chips={['⚡ For You', 'All', '💡 Tricks', '🔄 Workflows', '🆕 New Tools', '🧠 Capabilities', '🔧 Tool Updates']}
                active={filter}
                onSelect={setFilter}
            />

            {/* Hero Update Card */}
            {loading ? (
                <div style={{
                    margin: '0 20px 20px',
                    borderRadius: 28,
                    border: '1px solid var(--border-2)',
                    overflow: 'hidden',
                    background: 'var(--surface)',
                    height: 260,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <div style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        color: 'var(--text-3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}>
                        <div className="animate-pulse-live" style={{
                            width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)',
                        }} />
                        Fetching live AI news...
                    </div>
                </div>
            ) : hero ? (
                <div
                    onClick={() => onSelectUpdate(hero)}
                    style={{
                        margin: '0 20px 20px',
                        borderRadius: 28,
                        border: '1px solid var(--border-2)',
                        overflow: 'hidden',
                        background: 'var(--surface)',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease',
                    }}
                >
                    {/* Gradient image zone */}
                    <div style={{
                        height: 110,
                        background: 'linear-gradient(135deg, #1a0a1e 0%, #0f1a2e 40%, #0a1628 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                    }}>
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, transparent 70%)',
                        }} />
                        <span style={{ fontSize: 48, position: 'relative', zIndex: 1 }}>{hero.emoji || '🚀'}</span>
                    </div>
                    {/* Body */}
                    <div style={{ padding: '16px 18px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase' as const,
                                color: hero.type === 'trick' ? 'var(--orange)' : hero.type === 'capability' ? 'var(--red)' : hero.type === 'workflow' ? 'var(--blue)' : hero.type === 'new-tool' ? 'var(--green)' : 'var(--accent-2)',
                            }}>{hero.tag}</span>
                            <FomoScore score={hero.fomoScore} />
                        </div>
                        <h2 style={{
                            fontFamily: "'Syne', sans-serif",
                            fontSize: 16,
                            fontWeight: 700,
                            color: 'var(--text-1)',
                            lineHeight: 1.3,
                            margin: '0 0 6px',
                        }}>{hero.title}</h2>
                        <p style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 13,
                            color: 'var(--text-2)',
                            lineHeight: 1.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical' as const,
                            overflow: 'hidden',
                            marginBottom: 14,
                        }}>{hero.shortSummary}</p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectUpdate(hero);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: 'var(--accent)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 14,
                                    padding: '9px 16px',
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}>
                                <Play size={14} fill="#fff" />
                                Read More
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleHeroLesson();
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: 'transparent',
                                    color: generatingLesson ? 'var(--text-3)' : 'var(--accent-2)',
                                    border: '1px solid var(--border-2)',
                                    borderRadius: 14,
                                    padding: '9px 16px',
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 13,
                                    fontWeight: 500,
                                    cursor: generatingLesson ? 'not-allowed' : 'pointer',
                                }}>
                                <BookOpen size={14} />
                                {generatingLesson ? 'Generating...' : 'Learn'}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSaved(!saved);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: 'transparent',
                                    color: saved ? 'var(--yellow)' : 'var(--text-2)',
                                    border: `1px solid ${saved ? 'rgba(251,191,36,0.3)' : 'var(--border-2)'}`,
                                    borderRadius: 14,
                                    padding: '9px 16px',
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 13,
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                }}>
                                <Bookmark size={14} fill={saved ? 'var(--yellow)' : 'none'} />
                                {saved ? 'Saved' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* More Updates */}
            <SectionLabel>📰 MORE UPDATES</SectionLabel>
            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {loading ? (
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
                ) : filtered.map((item) => (
                    <NewsCard
                        key={item.id}
                        item={item}
                        onClick={() => onSelectUpdate(item)}
                    />
                ))}
            </div>

            <div style={{ height: 20 }} />
        </div>
    );
}
