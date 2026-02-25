import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    Linking,
    StyleSheet,
} from 'react-native';
import { ToolData, LessonData } from '../shared/types/types';
import { deltaService } from '../shared/api/deltaService';
import { ArrowLeft, ExternalLink, Play, Star, Zap, BookOpen } from 'lucide-react-native';
import { colors, radius } from '../shared/platform/theme';

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
    const [logoError, setLogoError] = useState(false);

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
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Status bar */}
            <View style={{ height: 44 }} />

            {/* Top bar */}
            <View style={styles.topBar}>
                <TouchableOpacity
                    onPress={onBack}
                    style={styles.backBtn}
                    activeOpacity={0.7}
                >
                    <ArrowLeft size={18} color={colors.text2} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => Linking.openURL(tool.url)}
                    style={styles.visitBtn}
                    activeOpacity={0.7}
                >
                    <ExternalLink size={14} color={colors.text2} />
                    <Text style={styles.visitBtnText}>Visit Tool</Text>
                </TouchableOpacity>
            </View>

            {/* Hero section */}
            <View style={styles.heroSection}>
                <View style={styles.logoContainer}>
                    {!logoError && tool.logoUrl ? (
                        <Image
                            source={{ uri: tool.logoUrl }}
                            style={styles.logo}
                            resizeMode="contain"
                            onError={() => setLogoError(true)}
                        />
                    ) : null}
                </View>
                <Text style={styles.toolName}>{tool.name}</Text>
                <Text style={styles.toolDescription}>{tool.description}</Text>

                {/* Match + Category pills */}
                <View style={styles.pillsRow}>
                    <View style={styles.matchPill}>
                        <Star size={12} color={colors.green} />
                        <Text style={styles.matchPillText}>{tool.matchScore}% Match</Text>
                    </View>
                    <View style={styles.categoryPill}>
                        <Text style={styles.categoryPillText}>{tool.category}</Text>
                    </View>
                    {tool.isNew && (
                        <View style={styles.newPill}>
                            <Text style={styles.newPillText}>NEW</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Delta's Analysis */}
            {tool.deltaAnalysis && (
                <View style={styles.analysisCard}>
                    <View style={styles.analysisHeader}>
                        <Zap size={14} color={colors.accent2} />
                        <Text style={styles.analysisLabel}>DELTA'S TAKE</Text>
                    </View>
                    <Text style={styles.analysisText}>"{tool.deltaAnalysis}"</Text>
                </View>
            )}

            {/* Use Cases */}
            {tool.useCases && tool.useCases.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>USE CASES</Text>
                    <View style={styles.tagsRow}>
                        {tool.useCases.map((uc, i) => (
                            <View key={i} style={styles.tag}>
                                <Text style={styles.tagText}>{uc}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Best For */}
            {tool.bestFor && tool.bestFor.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>BEST FOR</Text>
                    <View style={styles.tagsRow}>
                        {tool.bestFor.map((role, i) => (
                            <View key={i} style={styles.bestForTag}>
                                <Text style={styles.bestForTagText}>{role}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Mastery Path */}
            <View style={styles.section}>
                <Text style={styles.sectionLabel}>MASTERY PATH</Text>
                <View style={styles.masteryList}>
                    {MASTERY_LEVELS.map((ml) => (
                        <View
                            key={ml.level}
                            style={[
                                styles.masteryItem,
                                ml.level <= tool.mastery && styles.masteryItemActive,
                            ]}
                        >
                            <Text style={[
                                styles.masteryIcon,
                                ml.level <= tool.mastery && styles.masteryIconActive,
                            ]}>
                                {ml.icon}
                            </Text>
                            <View style={{ flex: 1 }}>
                                <Text style={[
                                    styles.masteryLabel,
                                    ml.level <= tool.mastery && styles.masteryLabelActive,
                                ]}>
                                    {ml.label}
                                </Text>
                                <Text style={styles.masterySublabel}>{ml.sublabel}</Text>
                            </View>
                            {ml.level <= tool.mastery && (
                                <Text style={styles.masteryCheck}>✓</Text>
                            )}
                        </View>
                    ))}
                </View>
            </View>

            {/* CTA Button */}
            <View style={styles.ctaSection}>
                <TouchableOpacity
                    onPress={handleGenerateLesson}
                    disabled={generating}
                    style={[styles.ctaBtn, generating && styles.ctaBtnDisabled]}
                    activeOpacity={0.85}
                >
                    {generating ? (
                        <>
                            <View style={styles.generatingDot} />
                            <Text style={styles.ctaBtnText}>Generating lesson...</Text>
                        </>
                    ) : (
                        <>
                            <BookOpen size={16} color="#fff" />
                            <Text style={styles.ctaBtnText}>Start Learning {tool.name}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <View style={{ height: 12 }} />

            {/* Full Guide Button */}
            {onOpenGuide && (
                <View style={styles.guideSection}>
                    <TouchableOpacity
                        onPress={() => onOpenGuide(tool)}
                        style={styles.guideBtn}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.guideBtnText}>📖 View Full Guide</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    topBar: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    visitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
    },
    visitBtnText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.text2,
    },
    heroSection: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 24,
    },
    logoContainer: {
        width: 72,
        height: 72,
        borderRadius: 20,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        overflow: 'hidden',
    },
    logo: {
        width: 48,
        height: 48,
    },
    toolName: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text1,
    },
    toolDescription: {
        fontSize: 13,
        color: colors.text3,
        marginTop: 4,
        textAlign: 'center',
    },
    pillsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    matchPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: radius.full,
        backgroundColor: 'rgba(52,211,153,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(52,211,153,0.3)',
    },
    matchPillText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.green,
    },
    categoryPill: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: radius.full,
        backgroundColor: colors.surface3,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoryPillText: {
        fontSize: 11,
        fontWeight: '500',
        color: colors.text2,
    },
    newPill: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: radius.full,
        backgroundColor: 'rgba(251,191,36,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(251,191,36,0.3)',
    },
    newPillText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.yellow,
    },
    analysisCard: {
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 16,
        backgroundColor: 'rgba(99,102,241,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(99,102,241,0.2)',
        borderRadius: 20,
    },
    analysisHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    analysisLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.accent2,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    analysisText: {
        fontSize: 14,
        color: colors.text1,
        lineHeight: 22.4,
        fontStyle: 'italic',
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        color: colors.text3,
        marginBottom: 10,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
    },
    tagText: {
        fontSize: 12,
        color: colors.text2,
    },
    bestForTag: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(52,211,153,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(52,211,153,0.2)',
    },
    bestForTagText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.green,
    },
    masteryList: {
        gap: 8,
        marginTop: 12,
    },
    masteryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 16,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
    },
    masteryItemActive: {
        backgroundColor: 'rgba(99,102,241,0.08)',
        borderColor: 'rgba(99,102,241,0.3)',
    },
    masteryIcon: {
        fontSize: 18,
        color: colors.text3,
    },
    masteryIconActive: {
        color: colors.accent2,
    },
    masteryLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text3,
    },
    masteryLabelActive: {
        color: colors.text1,
    },
    masterySublabel: {
        fontSize: 11,
        color: colors.text3,
        marginTop: 2,
    },
    masteryCheck: {
        fontSize: 14,
        color: colors.green,
    },
    ctaSection: {
        paddingHorizontal: 20,
    },
    ctaBtn: {
        width: '100%',
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.accent,
        borderRadius: 14,
    },
    ctaBtnDisabled: {
        backgroundColor: colors.surface3,
    },
    ctaBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    generatingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.6)',
    },
    guideSection: {
        paddingHorizontal: 20,
    },
    guideBtn: {
        width: '100%',
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.accentBg,
        borderWidth: 1,
        borderColor: 'rgba(99,102,241,0.25)',
        borderRadius: 14,
    },
    guideBtnText: {
        color: colors.accent2,
        fontSize: 14,
        fontWeight: '600',
    },
});
