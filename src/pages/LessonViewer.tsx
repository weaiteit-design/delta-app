import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LessonData } from '../shared/types/types';
import { storageService } from '../entities/user/storageService';
import { ArrowLeft, CheckCircle, Copy, Clock, Sparkles, ChevronRight, ExternalLink, PlayCircle } from 'lucide-react-native';
import { colors, radius } from '../shared/platform/theme';

interface LessonViewerProps {
    lesson: LessonData;
    onBack: () => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <View style={sectionLabelStyles.container}>
            <Text style={sectionLabelStyles.text}>{children}</Text>
        </View>
    );
}

const sectionLabelStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    text: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.text3,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
});

export function LessonViewer({ lesson, onBack }: LessonViewerProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [completed, setCompleted] = useState(false);
    const [copied, setCopied] = useState(false);
    const [leveledUpTo, setLeveledUpTo] = useState<string | null>(null);

    const steps = lesson.steps || ['Every AI tool has a core mental model — a way of thinking about inputs and outputs. The first step to mastering any tool is understanding what it\'s optimized for and where it falls short.', 'The most impactful technique across all AI tools is structured prompting: Context (who you are) → Task (what you need) → Constraints (format, length, tone). Try this now with any AI tool you have open.', 'Practice makes permanent: take one real task you have today and complete it using the structured prompt approach. Compare the output to what you would have gotten with a vague prompt.'];
    const totalSteps = steps.length;
    const isLastStep = currentStep >= totalSteps - 1;

    const handleComplete = () => {
        // Award XP via centralized service
        const { user, leveledUp } = storageService.addXP(lesson.xp || 25, lesson.id);

        if (leveledUp) {
            setLeveledUpTo(user.levelTitle);
        }
        setCompleted(true);
    };

    const handleCopyPrompt = async () => {
        if (lesson.taskPrompt) {
            await Clipboard.setStringAsync(lesson.taskPrompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (completed) {
        return (
            <ScrollView
                style={styles.completedContainer}
                contentContainerStyle={styles.completedContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={[
                    styles.completedIcon,
                    leveledUpTo ? styles.completedIconLevelUp : styles.completedIconNormal,
                ]}>
                    <CheckCircle size={50} color="#fff" />
                </View>

                {leveledUpTo && (
                    <View style={styles.levelUpBadge}>
                        <Text style={styles.levelUpText}>LEVEL UP</Text>
                    </View>
                )}

                <Text style={[styles.completedTitle, leveledUpTo && styles.completedTitleLarge]}>
                    {leveledUpTo ? `You are a ${leveledUpTo}!` : 'Lesson Complete!'}
                </Text>

                <Text style={styles.completedSubtitle}>{lesson.title}</Text>

                <View style={styles.xpCard}>
                    <Text style={styles.xpLabel}>XP GAINED</Text>
                    <Text style={[styles.xpValue, leveledUpTo ? styles.xpValueLevelUp : styles.xpValueNormal]}>
                        +{lesson.xp || 25}
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={onBack}
                    style={styles.backToAppBtn}
                    activeOpacity={0.85}
                >
                    <Text style={styles.backToAppText}>Back to App</Text>
                </TouchableOpacity>
            </ScrollView>
        );
    }

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
                <View style={styles.topBarCenter}>
                    <Text style={styles.pillText}>{lesson.pill || 'MICRO-LESSON'}</Text>
                </View>
                <View style={styles.topBarRight}>
                    <Clock size={12} color={colors.text3} />
                    <Text style={styles.durationText}>{lesson.duration || '2 min'}</Text>
                    <View style={styles.xpBadge}>
                        <Text style={styles.xpBadgeText}>+{lesson.xp || 25} XP</Text>
                    </View>
                </View>
            </View>

            {/* Title */}
            <View style={styles.titleSection}>
                <Text style={styles.title}>{lesson.title}</Text>
                {lesson.preview && (
                    <Text style={styles.preview}>{lesson.preview}</Text>
                )}
            </View>

            {/* Progress bar */}
            <View style={styles.progressSection}>
                <View style={styles.progressBarRow}>
                    {steps.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.progressSegment,
                                { backgroundColor: i <= currentStep ? colors.accent : colors.surface3 },
                            ]}
                        />
                    ))}
                </View>
                <Text style={styles.progressText}>Step {currentStep + 1} of {totalSteps}</Text>
            </View>

            {/* Current Step Content */}
            <View style={styles.stepCard}>
                <View style={styles.stepHeader}>
                    <View style={styles.stepNumCircle}>
                        <Text style={styles.stepNumText}>{currentStep + 1}</Text>
                    </View>
                    <Text style={styles.stepLabel}>STEP {currentStep + 1}</Text>
                </View>
                <Text style={styles.stepContent}>{steps[currentStep]}</Text>
            </View>

            {/* Practice Task (show on last step) */}
            {isLastStep && lesson.practiceTask && (
                <View style={styles.practiceCard}>
                    <View style={styles.practiceHeader}>
                        <View style={styles.practiceIconWrapper}>
                            <Sparkles size={16} color={colors.green} />
                        </View>
                        <Text style={styles.practiceLabelText}>PRACTICE TASK</Text>
                    </View>
                    <Text style={styles.practiceText}>{lesson.practiceTask}</Text>
                </View>
            )}

            {/* Copy-Paste Prompt (show on last step) */}
            {isLastStep && lesson.taskPrompt && (
                <View style={styles.promptCard}>
                    <View style={styles.promptHeader}>
                        <Text style={styles.promptLabel}>READY-TO-USE PROMPT</Text>
                        <TouchableOpacity
                            onPress={handleCopyPrompt}
                            style={styles.copyBtn}
                            activeOpacity={0.7}
                        >
                            <Copy size={12} color={copied ? colors.green : colors.accent2} />
                            <Text style={[styles.copyText, copied && styles.copyTextCopied]}>
                                {copied ? 'Copied!' : 'Copy'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.promptText}>{lesson.taskPrompt}</Text>
                </View>
            )}

            {/* Navigation Buttons */}
            <View style={styles.navButtons}>
                {currentStep > 0 && (
                    <TouchableOpacity
                        onPress={() => setCurrentStep(prev => prev - 1)}
                        style={styles.prevBtn}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.prevBtnText}>← Previous</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    onPress={isLastStep ? handleComplete : () => setCurrentStep(prev => prev + 1)}
                    style={[styles.nextBtn, isLastStep && styles.nextBtnComplete]}
                    activeOpacity={0.85}
                >
                    {isLastStep ? (
                        <>
                            <CheckCircle size={16} color="#fff" />
                            <Text style={styles.nextBtnText}>Complete (+{lesson.xp || 25} XP)</Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.nextBtnText}>Next Step</Text>
                            <ChevronRight size={16} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Related Sources */}
            {lesson.sources && lesson.sources.length > 0 && (
                <View style={styles.sourcesSection}>
                    <SectionLabel>📺 RELATED RESOURCES</SectionLabel>
                    <View style={styles.sourcesList}>
                        {lesson.sources.map((source, i) => (
                            <TouchableOpacity
                                key={i}
                                onPress={() => Linking.openURL(source.url)}
                                style={styles.sourceItem}
                                activeOpacity={0.8}
                            >
                                {source.thumbnail ? (
                                    <View style={styles.sourceThumbnail}>
                                        <View style={styles.sourceThumbnailOverlay}>
                                            <PlayCircle size={20} color="#fff" />
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.sourceIconWrapper}>
                                        <ExternalLink size={18} color={colors.accent2} />
                                    </View>
                                )}
                                <View style={styles.sourceInfo}>
                                    <Text style={styles.sourceTitle} numberOfLines={1}>{source.title}</Text>
                                    <Text style={styles.sourceType}>
                                        {source.url.includes('youtube.com') ? 'YouTube Video' : 'Reference Link'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
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
    completedContainer: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    completedContent: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
        padding: 40,
        paddingHorizontal: 20,
    },
    completedIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    completedIconNormal: {
        backgroundColor: colors.green,
    },
    completedIconLevelUp: {
        backgroundColor: colors.yellow,
    },
    levelUpBadge: {
        backgroundColor: 'rgba(251,191,36,0.15)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 100,
        marginBottom: 12,
    },
    levelUpText: {
        fontSize: 13,
        fontWeight: '800',
        color: colors.yellow,
        textTransform: 'uppercase',
        letterSpacing: 3,
    },
    completedTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.text1,
        marginBottom: 12,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    completedTitleLarge: {
        fontSize: 36,
    },
    completedSubtitle: {
        fontSize: 16,
        color: colors.text2,
        textAlign: 'center',
        marginBottom: 40,
        maxWidth: 280,
        lineHeight: 24,
    },
    xpCard: {
        alignItems: 'center',
        gap: 8,
        marginBottom: 40,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 24,
        paddingHorizontal: 48,
        borderRadius: 24,
        width: '100%',
        maxWidth: 300,
    },
    xpLabel: {
        fontSize: 12,
        color: colors.text3,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '700',
    },
    xpValue: {
        fontSize: 40,
        fontWeight: '800',
    },
    xpValueNormal: {
        color: colors.green,
    },
    xpValueLevelUp: {
        color: colors.yellow,
    },
    backToAppBtn: {
        paddingVertical: 16,
        paddingHorizontal: 36,
        width: '100%',
        maxWidth: 300,
        backgroundColor: colors.text1,
        borderRadius: 16,
        alignItems: 'center',
    },
    backToAppText: {
        color: colors.bg,
        fontSize: 16,
        fontWeight: '700',
    },
    topBar: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
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
        flexShrink: 0,
    },
    topBarCenter: {
        flex: 1,
    },
    pillText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        color: colors.accent2,
    },
    topBarRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    durationText: {
        fontSize: 11,
        color: colors.text3,
    },
    xpBadge: {
        backgroundColor: 'rgba(251,191,36,0.15)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radius.full,
    },
    xpBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.yellow,
    },
    titleSection: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text1,
        lineHeight: 28.6,
    },
    preview: {
        fontSize: 13,
        color: colors.text2,
        marginTop: 8,
        lineHeight: 20.8,
    },
    progressSection: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    progressBarRow: {
        flexDirection: 'row',
        gap: 4,
    },
    progressSegment: {
        flex: 1,
        height: 4,
        borderRadius: 100,
    },
    progressText: {
        fontSize: 11,
        color: colors.text3,
        marginTop: 6,
    },
    stepCard: {
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 24,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 24,
    },
    stepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    stepNumCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepNumText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#fff',
    },
    stepLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.text1,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    stepContent: {
        fontSize: 15,
        color: colors.text1,
        lineHeight: 24,
    },
    practiceCard: {
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 20,
        backgroundColor: 'rgba(52,211,153,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(52,211,153,0.3)',
        borderRadius: 20,
    },
    practiceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    practiceIconWrapper: {
        backgroundColor: 'rgba(52,211,153,0.2)',
        padding: 6,
        borderRadius: radius.full,
    },
    practiceLabelText: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.green,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    practiceText: {
        fontSize: 14,
        color: colors.text1,
        lineHeight: 22.4,
    },
    promptCard: {
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 14,
        backgroundColor: colors.surface3,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
    },
    promptHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    promptLabel: {
        fontSize: 10,
        fontWeight: '500',
        color: colors.text3,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    copyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    copyText: {
        fontSize: 11,
        color: colors.accent2,
    },
    copyTextCopied: {
        color: colors.green,
    },
    promptText: {
        fontSize: 12,
        color: colors.text2,
        lineHeight: 18,
    },
    navButtons: {
        paddingHorizontal: 20,
        flexDirection: 'row',
        gap: 10,
    },
    prevBtn: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        alignItems: 'center',
    },
    prevBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text2,
    },
    nextBtn: {
        flex: 1,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: colors.accent,
        borderRadius: 14,
    },
    nextBtnComplete: {
        backgroundColor: colors.green,
    },
    nextBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    sourcesSection: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    sourcesList: {
        gap: 12,
    },
    sourceItem: {
        flexDirection: 'row',
        gap: 12,
        padding: 12,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        alignItems: 'center',
    },
    sourceThumbnail: {
        width: 80,
        height: 45,
        borderRadius: 8,
        backgroundColor: colors.surface3,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sourceThumbnailOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    sourceIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: colors.surface3,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    sourceInfo: {
        flex: 1,
        minWidth: 0,
    },
    sourceTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text1,
    },
    sourceType: {
        fontSize: 11,
        color: colors.text3,
        marginTop: 2,
    },
});
