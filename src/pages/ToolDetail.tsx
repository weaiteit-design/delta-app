import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    Linking,
    Modal,
    TextInput,
    StyleSheet,
} from 'react-native';
import { ToolData, LessonData, ReviewData } from '../shared/types/types';
import { deltaService } from '../shared/api/deltaService';
import { getToolReleases, getToolAlternatives, getToolReviews, submitToolReview } from '../shared/api/toolsService';
import { IS_CONFIGURED } from '../shared/api/supabaseClient';
import { ReviewCard } from '../shared/ui/ReviewCard';
import { storageService } from '../entities/user/storageService';
import { ArrowLeft, ExternalLink, Star, Zap, BookOpen, ChevronDown, ChevronUp } from 'lucide-react-native';
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

    // Releases, alternatives, reviews
    const [releases, setReleases] = useState<{ version: string; date: string; notes: string[] }[]>([]);
    const [alternatives, setAlternatives] = useState<ToolData[]>([]);
    const [reviews, setReviews] = useState<ReviewData[]>([]);
    const [showAllReleases, setShowAllReleases] = useState(false);

    // Review modal
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewUseCase, setReviewUseCase] = useState('');
    const [reviewPros, setReviewPros] = useState('');
    const [reviewCons, setReviewCons] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewSubmitted, setReviewSubmitted] = useState(false);
    const [reviewXpEarned, setReviewXpEarned] = useState(0);

    const slug = tool.id || tool.name.toLowerCase().replace(/\s+/g, '-');

    useEffect(() => {
        if (!IS_CONFIGURED) return;
        Promise.all([
            getToolReleases(slug),
            getToolAlternatives(slug),
            getToolReviews(slug),
        ]).then(([rel, alt, rev]) => {
            setReleases(rel);
            setAlternatives(alt);
            setReviews(rev);
        });
    }, [slug]);

    const handleGenerateLesson = async () => {
        setGenerating(true);
        try {
            const lesson = await deltaService.generateToolLesson(tool);
            if (lesson) onStartLesson(lesson);
        } catch (e) {
            console.error('[ToolDetail] Lesson gen failed:', e);
        } finally {
            setGenerating(false);
        }
    };

    const handleSubmitReview = async () => {
        if (reviewRating === 0) return;
        setReviewSubmitting(true);
        try {
            const pros = reviewPros.split(',').map(s => s.trim()).filter(Boolean);
            const cons = reviewCons.split(',').map(s => s.trim()).filter(Boolean);
            const result = await submitToolReview(slug, {
                rating: reviewRating,
                pros,
                cons,
                use_case: reviewUseCase.trim(),
            });
            if (result.success) {
                storageService.addXP(result.xpEarned, `review:${slug}`);
                setReviewXpEarned(result.xpEarned);
                setReviewSubmitted(true);
                const fresh = await getToolReviews(slug);
                setReviews(fresh);
            }
        } finally {
            setReviewSubmitting(false);
        }
    };

    const visibleReleases = showAllReleases ? releases : releases.slice(0, 2);

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Status bar */}
            <View style={{ height: 44 }} />

            {/* Top bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
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
                    {tool.pricing && (
                        <View style={[
                            styles.pricingPill,
                            tool.pricing.model === 'free' && styles.pricingPillFree,
                        ]}>
                            <Text style={[
                                styles.pricingPillText,
                                tool.pricing.model === 'free' && styles.pricingPillTextFree,
                            ]}>
                                {tool.pricing.model === 'free'
                                    ? 'FREE'
                                    : tool.pricing.model === 'freemium'
                                        ? 'FREEMIUM'
                                        : tool.pricing.startingPrice
                                            ? `FROM ${tool.pricing.startingPrice}`
                                            : 'PAID'
                                }
                            </Text>
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

            {/* Version History */}
            {releases.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>VERSION HISTORY</Text>
                    <View style={styles.releasesList}>
                        {visibleReleases.map((r, i) => (
                            <View key={i} style={styles.releaseItem}>
                                <View style={styles.releaseHeader}>
                                    <Text style={styles.releaseVersion}>{r.version}</Text>
                                    {r.date ? (
                                        <Text style={styles.releaseDate}>
                                            {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </Text>
                                    ) : null}
                                </View>
                                {r.notes.slice(0, 3).map((note, ni) => (
                                    <Text key={ni} style={styles.releaseNote}>· {note}</Text>
                                ))}
                            </View>
                        ))}
                    </View>
                    {releases.length > 2 && (
                        <TouchableOpacity
                            onPress={() => setShowAllReleases(!showAllReleases)}
                            style={styles.showMoreBtn}
                            activeOpacity={0.7}
                        >
                            {showAllReleases
                                ? <ChevronUp size={14} color={colors.accent2} />
                                : <ChevronDown size={14} color={colors.accent2} />
                            }
                            <Text style={styles.showMoreText}>
                                {showAllReleases ? 'Show less' : `Show ${releases.length - 2} more releases`}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Alternatives */}
            {alternatives.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>ALTERNATIVES TO CONSIDER</Text>
                    <View style={styles.alternativesRow}>
                        {alternatives.slice(0, 4).map((alt, i) => (
                            <View key={i} style={styles.altChip}>
                                <Text style={styles.altChipText}>{alt.name}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

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

            {/* Reviews Section */}
            <View style={styles.section}>
                <View style={styles.reviewsHeader}>
                    <Text style={styles.sectionLabel}>
                        COMMUNITY REVIEWS {reviews.length > 0 ? `(${reviews.length})` : ''}
                    </Text>
                    <TouchableOpacity
                        onPress={() => { setShowReviewModal(true); setReviewSubmitted(false); }}
                        style={styles.writeReviewBtn}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.writeReviewText}>✏️ Write a Review</Text>
                    </TouchableOpacity>
                </View>

                {reviews.length === 0 ? (
                    <View style={styles.noReviews}>
                        <Text style={styles.noReviewsText}>
                            {IS_CONFIGURED
                                ? 'No reviews yet — be the first!'
                                : 'Connect Supabase to read and write reviews.'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.reviewsList}>
                        {reviews.slice(0, 3).map(r => (
                            <ReviewCard key={r.id} review={r} />
                        ))}
                    </View>
                )}
            </View>

            <View style={{ height: 40 }} />

            {/* Write Review Modal */}
            <Modal
                visible={showReviewModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowReviewModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />

                        {reviewSubmitted ? (
                            <View style={styles.reviewSuccessContainer}>
                                <Text style={styles.reviewSuccessEmoji}>🎉</Text>
                                <Text style={styles.reviewSuccessTitle}>Review submitted!</Text>
                                <Text style={styles.reviewSuccessXp}>+{reviewXpEarned} XP earned</Text>
                                <TouchableOpacity
                                    onPress={() => setShowReviewModal(false)}
                                    style={styles.modalCloseBtn}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.modalCloseBtnText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <Text style={styles.modalTitle}>Review {tool.name}</Text>
                                <Text style={styles.modalSubtitle}>Your review earns +30 XP</Text>

                                {/* Star picker */}
                                <View style={styles.starPicker}>
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <TouchableOpacity
                                            key={n}
                                            onPress={() => setReviewRating(n)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[
                                                styles.starPickerStar,
                                                n <= reviewRating && styles.starPickerStarActive,
                                            ]}>
                                                {n <= reviewRating ? '★' : '☆'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={styles.fieldLabel}>How are you using it?</Text>
                                <TextInput
                                    value={reviewUseCase}
                                    onChangeText={setReviewUseCase}
                                    placeholder="e.g. Writing marketing copy for my startup"
                                    placeholderTextColor={colors.text3}
                                    style={styles.textField}
                                    multiline
                                    maxLength={300}
                                />

                                <Text style={styles.fieldLabel}>Pros (comma-separated)</Text>
                                <TextInput
                                    value={reviewPros}
                                    onChangeText={setReviewPros}
                                    placeholder="e.g. Fast, Great UI, Affordable"
                                    placeholderTextColor={colors.text3}
                                    style={styles.textFieldSingle}
                                />

                                <Text style={styles.fieldLabel}>Cons (comma-separated)</Text>
                                <TextInput
                                    value={reviewCons}
                                    onChangeText={setReviewCons}
                                    placeholder="e.g. No API, Limited free tier"
                                    placeholderTextColor={colors.text3}
                                    style={styles.textFieldSingle}
                                />

                                <View style={styles.modalActions}>
                                    <TouchableOpacity
                                        onPress={() => setShowReviewModal(false)}
                                        style={styles.modalCancelBtn}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.modalCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleSubmitReview}
                                        disabled={reviewRating === 0 || reviewSubmitting}
                                        style={[
                                            styles.modalSubmitBtn,
                                            (reviewRating === 0 || reviewSubmitting) && styles.modalSubmitBtnDisabled,
                                        ]}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.modalSubmitText}>
                                            {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    topBar: {
        paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 12,
        backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
        alignItems: 'center', justifyContent: 'center',
    },
    visitBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12,
        backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
    },
    visitBtnText: { fontSize: 12, fontWeight: '500', color: colors.text2 },
    heroSection: {
        alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24,
    },
    logoContainer: {
        width: 72, height: 72, borderRadius: 20,
        backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
        alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden',
    },
    logo: { width: 48, height: 48 },
    toolName: { fontSize: 24, fontWeight: '800', color: colors.text1 },
    toolDescription: { fontSize: 13, color: colors.text3, marginTop: 4, textAlign: 'center' },
    pillsRow: {
        flexDirection: 'row', gap: 8, marginTop: 12,
        flexWrap: 'wrap', justifyContent: 'center',
    },
    matchPill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.full,
        backgroundColor: 'rgba(52,211,153,0.12)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)',
    },
    matchPillText: { fontSize: 11, fontWeight: '700', color: colors.green },
    categoryPill: {
        paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.full,
        backgroundColor: colors.surface3, borderWidth: 1, borderColor: colors.border,
    },
    categoryPillText: { fontSize: 11, fontWeight: '500', color: colors.text2 },
    newPill: {
        paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.full,
        backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)',
    },
    newPillText: { fontSize: 11, fontWeight: '700', color: colors.yellow },
    pricingPill: {
        paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.full,
        backgroundColor: colors.surface3, borderWidth: 1, borderColor: colors.border,
    },
    pricingPillFree: {
        backgroundColor: 'rgba(52,211,153,0.08)', borderColor: 'rgba(52,211,153,0.2)',
    },
    pricingPillText: { fontSize: 11, fontWeight: '600', color: colors.text3 },
    pricingPillTextFree: { color: colors.green },
    analysisCard: {
        marginHorizontal: 20, marginBottom: 20, padding: 16,
        backgroundColor: 'rgba(99,102,241,0.06)', borderWidth: 1,
        borderColor: 'rgba(99,102,241,0.2)', borderRadius: 20,
    },
    analysisHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    analysisLabel: {
        fontSize: 11, fontWeight: '700', color: colors.accent2,
        textTransform: 'uppercase', letterSpacing: 0.8,
    },
    analysisText: { fontSize: 14, color: colors.text1, lineHeight: 22.4, fontStyle: 'italic' },
    section: { paddingHorizontal: 20, marginBottom: 24 },
    sectionLabel: {
        fontSize: 10, fontWeight: '700', textTransform: 'uppercase',
        letterSpacing: 1.2, color: colors.text3, marginBottom: 10,
    },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: {
        paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12,
        backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
    },
    tagText: { fontSize: 12, color: colors.text2 },
    bestForTag: {
        paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12,
        backgroundColor: 'rgba(52,211,153,0.08)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.2)',
    },
    bestForTagText: { fontSize: 12, fontWeight: '600', color: colors.green },
    masteryList: { gap: 8, marginTop: 12 },
    masteryItem: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16,
        backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
    },
    masteryItemActive: { backgroundColor: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.3)' },
    masteryIcon: { fontSize: 18, color: colors.text3 },
    masteryIconActive: { color: colors.accent2 },
    masteryLabel: { fontSize: 13, fontWeight: '600', color: colors.text3 },
    masteryLabelActive: { color: colors.text1 },
    masterySublabel: { fontSize: 11, color: colors.text3, marginTop: 2 },
    masteryCheck: { fontSize: 14, color: colors.green },
    releasesList: { gap: 10 },
    releaseItem: {
        backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
        borderRadius: 16, padding: 14,
    },
    releaseHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    releaseVersion: { fontSize: 13, fontWeight: '700', color: colors.accent2 },
    releaseDate: { fontSize: 11, color: colors.text3 },
    releaseNote: { fontSize: 12, color: colors.text2, lineHeight: 18 },
    showMoreBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginTop: 10, alignSelf: 'flex-start',
    },
    showMoreText: { fontSize: 12, color: colors.accent2, fontWeight: '600' },
    alternativesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    altChip: {
        paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.full,
        backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
    },
    altChipText: { fontSize: 12, fontWeight: '600', color: colors.text1 },
    ctaSection: { paddingHorizontal: 20 },
    ctaBtn: {
        width: '100%', paddingVertical: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: colors.accent, borderRadius: 14,
    },
    ctaBtnDisabled: { backgroundColor: colors.surface3 },
    ctaBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    generatingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)' },
    guideSection: { paddingHorizontal: 20 },
    guideBtn: {
        width: '100%', paddingVertical: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: colors.accentBg, borderWidth: 1,
        borderColor: 'rgba(99,102,241,0.25)', borderRadius: 14,
    },
    guideBtnText: { color: colors.accent2, fontSize: 14, fontWeight: '600' },
    reviewsHeader: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12,
    },
    writeReviewBtn: {
        paddingVertical: 5, paddingHorizontal: 12, borderRadius: radius.full,
        backgroundColor: 'rgba(99,102,241,0.1)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
    },
    writeReviewText: { fontSize: 11, fontWeight: '600', color: colors.accent2 },
    noReviews: {
        paddingVertical: 20, alignItems: 'center',
        backgroundColor: colors.surface2, borderRadius: 16,
        borderWidth: 1, borderColor: colors.border,
    },
    noReviewsText: { fontSize: 13, color: colors.text3 },
    reviewsList: { gap: 10 },
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 20, paddingBottom: 36, paddingTop: 14,
    },
    modalHandle: {
        width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border,
        alignSelf: 'center', marginBottom: 20,
    },
    modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text1, marginBottom: 4 },
    modalSubtitle: { fontSize: 12, color: colors.green, marginBottom: 20, fontWeight: '600' },
    starPicker: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    starPickerStar: { fontSize: 32, color: colors.surface3 },
    starPickerStarActive: { color: colors.yellow },
    fieldLabel: {
        fontSize: 11, fontWeight: '700', color: colors.text3,
        textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
    },
    textField: {
        backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
        borderRadius: 14, padding: 12, fontSize: 13, color: colors.text1,
        minHeight: 72, marginBottom: 16, textAlignVertical: 'top',
    },
    textFieldSingle: {
        backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
        borderRadius: 14, padding: 12, fontSize: 13, color: colors.text1,
        height: 44, marginBottom: 16,
    },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    modalCancelBtn: {
        flex: 1, paddingVertical: 13, borderRadius: 14,
        backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
        alignItems: 'center',
    },
    modalCancelText: { fontSize: 14, fontWeight: '600', color: colors.text2 },
    modalSubmitBtn: {
        flex: 2, paddingVertical: 13, borderRadius: 14,
        backgroundColor: colors.accent, alignItems: 'center',
    },
    modalSubmitBtnDisabled: { backgroundColor: colors.surface3 },
    modalSubmitText: { fontSize: 14, fontWeight: '600', color: '#fff' },
    reviewSuccessContainer: { alignItems: 'center', paddingVertical: 32 },
    reviewSuccessEmoji: { fontSize: 48, marginBottom: 12 },
    reviewSuccessTitle: { fontSize: 20, fontWeight: '800', color: colors.text1, marginBottom: 6 },
    reviewSuccessXp: { fontSize: 14, color: colors.green, fontWeight: '700', marginBottom: 24 },
    modalCloseBtn: {
        paddingVertical: 13, paddingHorizontal: 40, borderRadius: 14,
        backgroundColor: colors.accent,
    },
    modalCloseBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
