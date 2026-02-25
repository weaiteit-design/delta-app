import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { storageService } from '../entities/user/storageService';
import { deltaService, CURATED_TOOLS } from '../shared/api/deltaService';
import { contentPipeline } from '../entities/news/contentPipeline';
import { VerifiedUpdate, ToolData, LessonData } from '../shared/types/types';
import { SectionLabel } from '../shared/ui/SectionLabel';
import { NewsCard } from '../features/NewsCard';
import { ToolCard } from '../features/ToolCard';
import { Bookmark, Library } from 'lucide-react-native';
import { colors, radius } from '../shared/platform/theme';

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

    useFocusEffect(useCallback(() => {
        const handleRefresh = () => {
            const currentSavedIds = storageService.getUser().savedArticleIds || [];
            if (savedNews.length !== currentSavedIds.length) {
                contentPipeline.getUpdates().then(allUpdates => {
                    const savedItems = allUpdates.filter(u => currentSavedIds.includes(u.id));
                    setSavedNews(savedItems);
                });
            }
        };
        handleRefresh();
    }, [savedNews.length]));

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Status bar */}
            <View style={{ height: 44 }} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.headerIcon}>
                        <Library size={20} color="#fff" />
                    </View>
                    <Text style={styles.headerTitle}>Library</Text>
                </View>
                <Text style={styles.headerSubtitle}>Your personal collection of saved AI intelligence.</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    onPress={() => setActiveTab('news')}
                    style={[styles.tab, activeTab === 'news' && styles.tabActive]}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.tabText, activeTab === 'news' && styles.tabTextActive]}>
                        Saved News ({savedNews.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('tools')}
                    style={[styles.tab, activeTab === 'tools' && styles.tabActive]}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.tabText, activeTab === 'tools' && styles.tabTextActive]}>
                        Saved Tools ({savedTools.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* News Content */}
            {activeTab === 'news' && (
                <View style={styles.newsContent}>
                    {loading ? (
                        <View style={styles.emptyCenter}>
                            <Text style={styles.loadingText}>Loading saved items...</Text>
                        </View>
                    ) : savedNews.length > 0 ? (
                        savedNews.map(item => (
                            <NewsCard key={item.id} item={item} onClick={() => onSelectUpdate(item)} />
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Bookmark size={32} color={colors.text3} style={{ opacity: 0.5, marginBottom: 16 }} />
                            <Text style={styles.emptyTitle}>No saved news yet</Text>
                            <Text style={styles.emptySubtitle}>
                                Tap the bookmark icon on any news update to save it here for later reference.
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* Tools Content */}
            {activeTab === 'tools' && (
                <View style={styles.toolsContent}>
                    {savedTools.length > 0 ? (
                        <View style={styles.toolsGrid}>
                            {savedTools.map(tool => (
                                <View key={tool.id} style={styles.toolGridItem}>
                                    <ToolCard tool={{ ...tool, matchScore: tool.matchScore || 90 }} onClick={() => onSelectTool(tool)} />
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <Bookmark size={32} color={colors.text3} style={{ opacity: 0.5, marginBottom: 16 }} />
                            <Text style={styles.emptyTitle}>No saved tools yet</Text>
                            <Text style={styles.emptySubtitle}>
                                Discover and save tools to build your ideal AI workspace.
                            </Text>
                        </View>
                    )}
                </View>
            )}

            <View style={{ height: 100 }} />
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
        paddingBottom: 16,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
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
    tabContainer: {
        marginHorizontal: 20,
        marginBottom: 24,
        flexDirection: 'row',
        backgroundColor: colors.surface2,
        padding: 4,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 12,
    },
    tabActive: {
        backgroundColor: colors.surface3,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text3,
    },
    tabTextActive: {
        color: colors.text1,
    },
    newsContent: {
        paddingHorizontal: 20,
        gap: 12,
    },
    emptyCenter: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        fontSize: 14,
        color: colors.text3,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
        backgroundColor: colors.surface2,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border2,
        borderStyle: 'dashed',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text2,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: colors.text3,
        textAlign: 'center',
        lineHeight: 21,
    },
    toolsContent: {
        paddingHorizontal: 20,
    },
    toolsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    toolGridItem: {
        width: '48%',
        alignItems: 'center',
    },
});
