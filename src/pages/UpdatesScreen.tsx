import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { contentPipeline, scoreForUser } from '../entities/news/contentPipeline';
import { deltaService } from '../shared/api/deltaService';
import { storageService } from '../entities/user/storageService';
import { VerifiedUpdate, LessonData } from '../shared/types/types';
import { getPipelineStats } from '../entities/news/contentCache';
import { SectionLabel } from '../shared/ui/SectionLabel';
import { FilterChips } from '../shared/ui/FilterChips';
import { NewsCard } from '../features/NewsCard';
import { FomoScore } from '../shared/ui/FomoScore';
import { Play, Bookmark, BookOpen } from 'lucide-react-native';
import { colors, radius } from '../shared/platform/theme';

interface UpdatesScreenProps {
    onSelectUpdate: (update: VerifiedUpdate) => void;
    onStartLesson: (lesson: LessonData) => void;
}

export function UpdatesScreen({ onSelectUpdate, onStartLesson }: UpdatesScreenProps) {
    const [filter, setFilter] = useState('⚡ For You');
    const [updates, setUpdates] = useState<VerifiedUpdate[]>([]);
    const [loading, setLoading] = useState(true);
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

    const rest = updates.length <= 3 ? updates : updates.slice(1);

    const filtered = (() => {
        if (filter === '⚡ For You') {
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

    const getTypeColor = (type: string) => {
        if (type === 'trick') return colors.orange;
        if (type === 'capability') return colors.red;
        if (type === 'workflow') return colors.blue;
        if (type === 'new-tool') return colors.green;
        return colors.accent2;
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Status bar */}
            <View style={{ height: 44 }} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Updates</Text>
                {/* Pipeline source indicator */}
                <View style={styles.headerRight}>
                    <View style={[
                        styles.statusBadge,
                        { borderColor: stats.cacheHit ? 'rgba(96,165,250,0.4)' : 'rgba(52,211,153,0.4)' }
                    ]}>
                        <View style={[
                            styles.statusDot,
                            { backgroundColor: stats.cacheHit ? colors.accent : colors.green }
                        ]} />
                        <Text style={[
                            styles.statusText,
                            { color: stats.cacheHit ? colors.accent : colors.green }
                        ]}>
                            {stats.cacheHit ? 'Cached' : loading ? 'Fetching...' : 'Live'}
                        </Text>
                    </View>
                    {activeSources > 0 && (
                        <View style={styles.sourcesBadge}>
                            <Text style={styles.sourcesText}>{activeSources}/{totalSources} sources</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Filter chips */}
            <FilterChips
                chips={['⚡ For You', 'All', '💡 Tricks', '🔄 Workflows', '🆕 New Tools', '🧠 Capabilities', '🔧 Tool Updates']}
                active={filter}
                onSelect={setFilter}
            />

            {/* Hero Update Card */}
            {loading ? (
                <View style={styles.heroSkeleton}>
                    <View style={styles.skeletonLoading}>
                        <View style={styles.skeletonDot} />
                        <Text style={styles.skeletonText}>Fetching live AI news...</Text>
                    </View>
                </View>
            ) : hero ? (
                <TouchableOpacity
                    onPress={() => onSelectUpdate(hero)}
                    style={styles.heroCard}
                    activeOpacity={0.85}
                >
                    {/* Gradient image zone - use plain backgroundColor */}
                    <View style={styles.heroImageZone}>
                        <View style={styles.heroImageOverlay} />
                        <Text style={styles.heroEmoji}>{hero.emoji || '🚀'}</Text>
                    </View>
                    {/* Body */}
                    <View style={styles.heroBody}>
                        <View style={styles.heroTagRow}>
                            <Text style={[styles.heroTag, { color: getTypeColor(hero.type) }]}>
                                {hero.tag}
                            </Text>
                            <FomoScore score={hero.fomoScore} />
                        </View>
                        <Text style={styles.heroTitle}>{hero.title}</Text>
                        <Text style={styles.heroSummary} numberOfLines={2}>{hero.shortSummary}</Text>
                        <View style={styles.heroButtons}>
                            <TouchableOpacity
                                onPress={() => onSelectUpdate(hero)}
                                style={styles.readMoreBtn}
                                activeOpacity={0.8}
                            >
                                <Play size={14} color="#fff" fill="#fff" />
                                <Text style={styles.readMoreText}>Read More</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleHeroLesson}
                                style={[styles.learnBtn, generatingLesson && styles.learnBtnDisabled]}
                                activeOpacity={0.8}
                                disabled={generatingLesson}
                            >
                                <BookOpen size={14} color={generatingLesson ? colors.text3 : colors.accent2} />
                                <Text style={[styles.learnText, generatingLesson && styles.learnTextDisabled]}>
                                    {generatingLesson ? 'Generating...' : 'Learn'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setSaved(!saved)}
                                style={[styles.saveBtn, saved && styles.saveBtnActive]}
                                activeOpacity={0.8}
                            >
                                <Bookmark size={14} color={saved ? colors.yellow : colors.text2} fill={saved ? colors.yellow : 'none'} />
                                <Text style={[styles.saveText, saved && styles.saveTextActive]}>
                                    {saved ? 'Saved' : 'Save'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            ) : null}

            {/* More Updates */}
            <SectionLabel>📰 MORE UPDATES</SectionLabel>
            <View style={styles.updatesList}>
                {loading ? (
                    [1, 2, 3].map(i => (
                        <View key={i} style={styles.skeletonCard}>
                            <View style={styles.skeletonLine30} />
                            <View style={styles.skeletonLine80} />
                            <View style={styles.skeletonLine40} />
                        </View>
                    ))
                ) : filtered.map((item) => (
                    <NewsCard
                        key={item.id}
                        item={item}
                        onClick={() => onSelectUpdate(item)}
                    />
                ))}
            </View>

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
        paddingBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text1,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: 1,
        borderRadius: 20,
        paddingVertical: 3,
        paddingHorizontal: 10,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    sourcesBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 20,
        paddingVertical: 3,
        paddingHorizontal: 10,
    },
    sourcesText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.text3,
    },
    heroSkeleton: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: radius.xxl,
        borderWidth: 1,
        borderColor: colors.border2,
        backgroundColor: colors.surface,
        height: 260,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skeletonLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    skeletonDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.accent,
    },
    skeletonText: {
        fontSize: 13,
        color: colors.text3,
    },
    heroCard: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: radius.xxl,
        borderWidth: 1,
        borderColor: colors.border2,
        overflow: 'hidden',
        backgroundColor: colors.surface,
    },
    heroImageZone: {
        height: 110,
        backgroundColor: '#0f1a2e',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    heroImageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(99,102,241,0.10)',
    },
    heroEmoji: {
        fontSize: 48,
        zIndex: 1,
    },
    heroBody: {
        padding: 16,
        paddingBottom: 18,
    },
    heroTagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    heroTag: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    heroTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text1,
        lineHeight: 20.8,
        marginBottom: 6,
    },
    heroSummary: {
        fontSize: 13,
        color: colors.text2,
        lineHeight: 19.5,
        marginBottom: 14,
    },
    heroButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    readMoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.accent,
        borderRadius: 14,
        paddingVertical: 9,
        paddingHorizontal: 16,
    },
    readMoreText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    learnBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.border2,
        borderRadius: 14,
        paddingVertical: 9,
        paddingHorizontal: 16,
    },
    learnBtnDisabled: {
        opacity: 0.5,
    },
    learnText: {
        color: colors.accent2,
        fontSize: 13,
        fontWeight: '500',
    },
    learnTextDisabled: {
        color: colors.text3,
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.border2,
        borderRadius: 14,
        paddingVertical: 9,
        paddingHorizontal: 16,
    },
    saveBtnActive: {
        borderColor: 'rgba(251,191,36,0.3)',
    },
    saveText: {
        color: colors.text2,
        fontSize: 13,
        fontWeight: '500',
    },
    saveTextActive: {
        color: colors.yellow,
    },
    updatesList: {
        paddingHorizontal: 20,
        gap: 10,
    },
    skeletonCard: {
        padding: 14,
        paddingHorizontal: 16,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 20,
        height: 72,
        marginBottom: 10,
    },
    skeletonLine30: {
        width: '30%',
        height: 10,
        borderRadius: 4,
        backgroundColor: colors.surface3,
        marginBottom: 8,
    },
    skeletonLine80: {
        width: '80%',
        height: 14,
        borderRadius: 4,
        backgroundColor: colors.surface3,
        marginBottom: 8,
    },
    skeletonLine40: {
        width: '40%',
        height: 10,
        borderRadius: 4,
        backgroundColor: colors.surface3,
    },
});
