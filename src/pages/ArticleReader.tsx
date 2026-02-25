import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking,
} from 'react-native';
import { VerifiedUpdate, LessonData } from '../shared/types/types';
import { deltaService } from '../shared/api/deltaService';
import { ArrowLeft, ExternalLink, BookOpen, Bookmark, Clock, Globe } from 'lucide-react-native';
import { FomoScore } from '../shared/ui/FomoScore';
import { colors, radius } from '../shared/platform/theme';

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
            if (lesson) onStartLesson(lesson);
        } catch (e) {
            console.error('[ArticleReader] Lesson gen failed:', e);
        } finally {
            setGenerating(false);
        }
    };

    const typeConfig: Record<string, { color: string; bg: string; border: string }> = {
        'capability': { color: colors.red, bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)' },
        'new-tool': { color: colors.green, bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)' },
        'workflow': { color: colors.blue, bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.3)' },
        'tool-update': { color: colors.accent2, bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.3)' },
        'trick': { color: colors.orange, bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.3)' },
    };
    const config = typeConfig[article.type] || typeConfig['tool-update'];
    const openUrl = (url: string) => { if (url) Linking.openURL(url).catch(() => {}); };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <ArrowLeft size={18} color={colors.text2} />
                </TouchableOpacity>
                <View style={styles.topActions}>
                    <TouchableOpacity
                        onPress={() => setSaved(!saved)}
                        style={[styles.actionBtn, saved && styles.actionBtnSaved]}
                    >
                        <Bookmark size={14} fill={saved ? colors.yellow : 'none'} color={saved ? colors.yellow : colors.text2} />
                        <Text style={[styles.actionBtnText, saved && { color: colors.yellow }]}>
                            {saved ? 'Saved' : 'Save'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => article.url && openUrl(article.url)} style={styles.actionBtn}>
                        <ExternalLink size={14} color={colors.text2} />
                        <Text style={styles.actionBtnText}>Source</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.heroGradient}>
                <View style={styles.heroOverlay} />
                <Text style={styles.heroEmoji}>{article.emoji || '⚡'}</Text>
            </View>

            <View style={styles.tagRow}>
                <View style={[styles.tagPill, { backgroundColor: config.bg, borderColor: config.border }]}>
                    <Text style={[styles.tagText, { color: config.color }]}>{article.tag}</Text>
                </View>
                <FomoScore score={article.fomoScore} />
            </View>

            <View style={styles.titleSection}>
                <Text style={styles.title}>{article.title}</Text>
            </View>

            <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                    <Globe size={12} color={colors.text3} />
                    <Text style={styles.metaText}>{article.source}</Text>
                </View>
                <View style={styles.metaItem}>
                    <Clock size={12} color={colors.text3} />
                    <Text style={styles.metaText}>{article.timeAgo}</Text>
                </View>
            </View>

            <View style={styles.summaryCard}>
                <Text style={styles.summaryText}>{article.shortSummary}</Text>
            </View>

            <View style={styles.ctaSection}>
                <TouchableOpacity
                    onPress={handleGenerateLesson}
                    disabled={generating}
                    style={[styles.lessonBtn, generating && styles.lessonBtnDisabled]}
                >
                    <BookOpen size={16} color="#fff" />
                    <Text style={styles.lessonBtnText}>
                        {generating ? 'Generating lesson...' : 'Learn More — Generate Micro-Lesson'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.sourceSection}>
                <TouchableOpacity onPress={() => article.url && openUrl(article.url)} style={styles.sourceBtn}>
                    <ExternalLink size={14} color={colors.text2} />
                    <Text style={styles.sourceBtnText}>
                        Read Full Article at {article.sourceDomain || 'Source'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    topBar: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: radius.md,
        backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
        alignItems: 'center', justifyContent: 'center',
    },
    topActions: { flexDirection: 'row', gap: 8 },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md,
        backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
    },
    actionBtnSaved: { backgroundColor: 'rgba(251,191,36,0.12)', borderColor: 'rgba(251,191,36,0.3)' },
    actionBtnText: { fontSize: 12, fontWeight: '500', color: colors.text2 },
    heroGradient: {
        marginHorizontal: 20, height: 100, borderRadius: radius.xl,
        backgroundColor: '#0f1a2e', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden', marginBottom: 20,
    },
    heroOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(99,102,241,0.15)',
    },
    heroEmoji: { fontSize: 48, zIndex: 1 },
    tagRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginBottom: 12 },
    tagPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1 },
    tagText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    titleSection: { paddingHorizontal: 20 },
    title: { fontSize: 22, fontWeight: '800', color: colors.text1, lineHeight: 30 },
    metaRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 20, paddingVertical: 12,
    },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, color: colors.text3 },
    summaryCard: {
        marginHorizontal: 20, marginBottom: 24, padding: 16,
        backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl,
    },
    summaryText: { fontSize: 14, color: colors.text1, lineHeight: 24 },
    ctaSection: { paddingHorizontal: 20, marginBottom: 12 },
    lessonBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 14, backgroundColor: colors.accent, borderRadius: 14,
    },
    lessonBtnDisabled: { backgroundColor: colors.surface3 },
    lessonBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
    sourceSection: { paddingHorizontal: 20 },
    sourceBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 12, backgroundColor: 'transparent',
        borderWidth: 1, borderColor: colors.border, borderRadius: 14,
    },
    sourceBtnText: { fontSize: 13, fontWeight: '500', color: colors.text2 },
});
