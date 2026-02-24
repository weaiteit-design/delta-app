import React, { useState, useEffect } from 'react';
import { contentPipeline } from '../entities/news/contentPipeline';
import { BottomNav, TabName } from '../shared/ui/BottomNav';
import { HomeScreen } from '../pages/HomeScreen';
import { LearnScreen } from '../pages/LearnScreen';
import { UpdatesScreen } from '../pages/UpdatesScreen';
import { ToolsScreen } from '../pages/ToolsScreen';
import { ChatScreen } from '../pages/ChatScreen';
import { ProfileScreen } from '../pages/ProfileScreen';
import { PreferencesScreen } from '../pages/PreferencesScreen';
import { LessonViewer } from '../pages/LessonViewer';
import { ToolDetail } from '../pages/ToolDetail';
import { ToolGuide } from '../pages/ToolGuide';
import { ArticleReader } from '../pages/ArticleReader';
import { LibraryScreen } from '../pages/LibraryScreen';
import { AuthScreen } from '../pages/AuthScreen';
import { supabase } from '../shared/api/supabaseClient';
import { storageService } from '../entities/user/storageService';
import { ToolData, VerifiedUpdate, LessonData } from '../shared/types/types';
import { ErrorBoundary } from '../shared/ui/ErrorBoundary';

// Navigation overlay types
type OverlayScreen =
    | { type: 'none' }
    | { type: 'profile' }
    | { type: 'preferences' }
    | { type: 'lesson'; lesson: LessonData }
    | { type: 'tool'; tool: ToolData }
    | { type: 'guide'; tool: ToolData }
    | { type: 'article'; article: VerifiedUpdate };

export default function App() {
    const [activeTab, setActiveTab] = useState<TabName>('home');
    const [overlay, setOverlay] = useState<OverlayScreen>({ type: 'none' });
    const [session, setSession] = useState<any>(null);
    const [authChecking, setAuthChecking] = useState(true);

    React.useEffect(() => {
        // Initial session check
        if (supabase.auth) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                setSession(session);
                setAuthChecking(false);
            }).catch(() => setAuthChecking(false));

            // Listen for auth changes
            const {
                data: { subscription },
            } = supabase.auth.onAuthStateChange((_event, session) => {
                setSession(session);
                if (session?.user) {
                    storageService.syncFromCloud();
                }
            });

            return () => subscription?.unsubscribe();
        } else {
            setAuthChecking(false);
            return () => { };
        }
    }, []);

    // Foreground refresh logic
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('[App] Foregrounded — checking for updates');
                contentPipeline.getUpdates().catch(() => { });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Navigation callbacks
    const nav = {
        openProfile: () => setOverlay({ type: 'profile' }),
        openTool: (tool: ToolData) => setOverlay({ type: 'tool', tool }),
        openArticle: (article: VerifiedUpdate) => setOverlay({ type: 'article', article }),
        openLesson: (lesson: LessonData) => setOverlay({ type: 'lesson', lesson }),
        goBack: () => setOverlay({ type: 'none' }),
    };

    const renderScreen = () => {
        // Overlay screens (stacked on top)
        switch (overlay.type) {
            case 'profile':
                return (
                    <ProfileScreen
                        onClose={nav.goBack}
                        onOpenPreferences={() => setOverlay({ type: 'preferences' })}
                    />
                );
            case 'preferences':
                return <PreferencesScreen onClose={nav.goBack} />;
            case 'lesson':
                return <LessonViewer lesson={overlay.lesson} onBack={nav.goBack} />;
            case 'tool':
                return (
                    <ToolDetail
                        tool={overlay.tool}
                        onBack={nav.goBack}
                        onStartLesson={(lesson: LessonData) => setOverlay({ type: 'lesson', lesson })}
                        onOpenGuide={(tool) => setOverlay({ type: 'guide', tool })}
                    />
                );
            case 'guide':
                return (
                    <ToolGuide
                        tool={overlay.tool}
                        onBack={nav.goBack}
                        onStartLesson={(lesson: LessonData) => setOverlay({ type: 'lesson', lesson })}
                    />
                );
            case 'article':
                return (
                    <ArticleReader
                        article={overlay.article}
                        onBack={nav.goBack}
                        onStartLesson={(lesson: LessonData) => setOverlay({ type: 'lesson', lesson })}
                    />
                );
        }

        // Tab screens
        switch (activeTab) {
            case 'home':
                return <HomeScreen onProfile={nav.openProfile} onSelectTool={nav.openTool} onSelectUpdate={nav.openArticle} onStartLesson={nav.openLesson} />;
            case 'learn':
                return <LearnScreen onStartLesson={nav.openLesson} />;
            case 'updates':
                return <UpdatesScreen onSelectUpdate={nav.openArticle} onStartLesson={nav.openLesson} />;
            case 'tools':
                return <ToolsScreen onSelectTool={nav.openTool} />;
            case 'chat':
                return <ChatScreen onStartLesson={nav.openLesson} onSelectTool={nav.openTool} />;
            case 'library':
                return <LibraryScreen onSelectUpdate={nav.openArticle} onSelectTool={nav.openTool} />;
            default:
                return <HomeScreen onProfile={nav.openProfile} onSelectTool={nav.openTool} onSelectUpdate={nav.openArticle} onStartLesson={nav.openLesson} />;
        }
    };

    if (authChecking) {
        return (
            <div className="phone-frame" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
                <div style={{ color: 'var(--text-3)', fontFamily: "'DM Sans', sans-serif" }}>Loading...</div>
            </div>
        );
    }

    if (!session && supabase.auth) {
        return (
            <div className="phone-frame">
                <AuthScreen onLogin={() => {
                    // Handled automatically by onAuthStateChange listener if using Supabase credentials
                    if (!supabase.auth) setSession(true); // fallback for local-only mock mode
                }} />
            </div>
        );
    }

    return (
        <div className="phone-frame">
            <ErrorBoundary fallbackMessage="This screen encountered an error. Tap below to try again.">
                {renderScreen()}
            </ErrorBoundary>
            {overlay.type === 'none' && (
                <BottomNav
                    active={activeTab}
                    onSelect={(tab) => {
                        setOverlay({ type: 'none' });
                        setActiveTab(tab);
                    }}
                />
            )}
        </div>
    );
}
