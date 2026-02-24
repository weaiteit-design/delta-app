import React, { useState, useEffect } from 'react';
import { storageService } from '../entities/user/storageService';
import { deltaService, CURATED_TOOLS } from '../shared/api/deltaService';
import { contentPipeline } from '../entities/news/contentPipeline';
import { VerifiedUpdate, ToolData, LessonData } from '../shared/types/types';
import { SectionLabel } from '../shared/ui/SectionLabel';
import { NewsCard } from '../features/NewsCard';
import { ToolCard } from '../features/ToolCard';
import { Bookmark, Library } from 'lucide-react';

interface LibraryScreenProps {
    onSelectUpdate: (update: VerifiedUpdate) => void;
    onSelectTool: (tool: ToolData) => void;
}

export function LibraryScreen({ onSelectUpdate, onSelectTool }: LibraryScreenProps) {
    const [activeTab, setActiveTab] = useState<'news' | 'tools'>('news');
    const [savedNews, setSavedNews] = useState<VerifiedUpdate[]>([]);
    const [loading, setLoading] = useState(true);

    const user = storageService.getUser();
    const savedToolIds = user.savedToolIds || [];
    const savedTools = CURATED_TOOLS.filter(t => savedToolIds.includes(t.id));

    useEffect(() => {
        let mounted = true;

        // Fetch updates to resolve saved news items
        contentPipeline.getUpdates().then(allUpdates => {
            if (mounted) {
                const userSaved = storageService.getUser().savedArticleIds || [];
                const savedItems = allUpdates.filter(u => userSaved.includes(u.id));
                setSavedNews(savedItems);
                setLoading(false);
            }
        }).catch(() => {
            if (mounted) setLoading(false);
        });

        return () => { mounted = false; };
    }, []);

    // Also listen to focus events to refresh if user saved something on another screen
    useEffect(() => {
        const handleRefresh = () => {
            const currentSavedIds = storageService.getUser().savedArticleIds || [];
            if (savedNews.length !== currentSavedIds.length) {
                // If counts differ, do a hard refresh of the news (naive but works for local state)
                contentPipeline.getUpdates().then(allUpdates => {
                    const savedItems = allUpdates.filter(u => currentSavedIds.includes(u.id));
                    setSavedNews(savedItems);
                });
            }
        };

        window.addEventListener('focus', handleRefresh);
        return () => window.removeEventListener('focus', handleRefresh);
    }, [savedNews.length]);

    return (
        <div className="screen-container">
            {/* Status bar */}
            <div style={{ height: 44 }} />

            {/* Header */}
            <div style={{ padding: '8px 20px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Library size={20} color="#fff" />
                    </div>
                    <h1 style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 24,
                        fontWeight: 800,
                        color: 'var(--text-1)',
                        margin: 0,
                    }}>Library</h1>
                </div>
                <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    color: 'var(--text-3)',
                    marginTop: 4,
                }}>Your personal collection of saved AI intelligence.</p>
            </div>

            {/* Tabs */}
            <div style={{
                margin: '0 20px 24px',
                display: 'flex',
                background: 'var(--surface-2)',
                padding: 4,
                borderRadius: 16,
                border: '1px solid var(--border)',
            }}>
                <button
                    onClick={() => setActiveTab('news')}
                    style={{
                        flex: 1, padding: '10px 0', border: 'none',
                        background: activeTab === 'news' ? 'var(--surface-3)' : 'transparent',
                        borderRadius: 12, color: activeTab === 'news' ? 'var(--text-1)' : 'var(--text-3)',
                        fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.2s',
                    }}
                >
                    Saved News ({savedNews.length})
                </button>
                <button
                    onClick={() => setActiveTab('tools')}
                    style={{
                        flex: 1, padding: '10px 0', border: 'none',
                        background: activeTab === 'tools' ? 'var(--surface-3)' : 'transparent',
                        borderRadius: 12, color: activeTab === 'tools' ? 'var(--text-1)' : 'var(--text-3)',
                        fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.2s',
                    }}
                >
                    Saved Tools ({savedTools.length})
                </button>
            </div>

            {/* Content */}
            {activeTab === 'news' && (
                <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
                            Loading saved items...
                        </div>
                    ) : savedNews.length > 0 ? (
                        savedNews.map(item => (
                            <NewsCard key={item.id} item={item} onClick={() => onSelectUpdate(item)} />
                        ))
                    ) : (
                        <div style={{
                            textAlign: 'center', padding: '60px 20px',
                            background: 'var(--surface-2)', borderRadius: 24, border: '1px dashed var(--border-2)',
                        }}>
                            <Bookmark size={32} color="var(--text-3)" style={{ opacity: 0.5, marginBottom: 16 }} />
                            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, color: 'var(--text-2)', margin: '0 0 8px' }}>No saved news yet</h3>
                            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>
                                Tap the bookmark icon on any news update to save it here for later reference.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'tools' && (
                <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    {savedTools.length > 0 ? (
                        savedTools.map(tool => (
                            <div key={tool.id} style={{ display: 'flex', justifyContent: 'center' }}>
                                <ToolCard tool={{ ...tool, matchScore: tool.matchScore || 90 }} onClick={() => onSelectTool(tool)} />
                            </div>
                        ))
                    ) : (
                        <div style={{
                            gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px',
                            background: 'var(--surface-2)', borderRadius: 24, border: '1px dashed var(--border-2)',
                        }}>
                            <Bookmark size={32} color="var(--text-3)" style={{ opacity: 0.5, marginBottom: 16 }} />
                            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, color: 'var(--text-2)', margin: '0 0 8px' }}>No saved tools yet</h3>
                            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>
                                Discover and save tools to build your ideal AI workspace.
                            </p>
                        </div>
                    )}
                </div>
            )}

            <div style={{ height: 100 }} />
        </div>
    );
}
