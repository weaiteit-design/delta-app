import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    StyleSheet,
} from 'react-native';
import {
    storageService,
    UserProfile,
    ROLES,
    INDUSTRIES,
    GOALS,
    AI_LEVELS,
    LEARNING_STYLES,
    CONTENT_CATEGORIES,
} from '../entities/user/storageService';
import { CURATED_TOOLS } from '../shared/api/deltaService';
import { colors, radius } from '../shared/platform/theme';

interface OnboardingScreenProps {
    onComplete: () => void;
}

const TOTAL_STEPS = 6;

function Chip({ label, selected, onPress, emoji }: { label: string; selected: boolean; onPress: () => void; emoji?: string }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[chipStyles.chip, selected && chipStyles.chipSelected]}
            activeOpacity={0.7}
        >
            {emoji && <Text style={chipStyles.emoji}>{emoji}</Text>}
            <Text style={[chipStyles.label, selected && chipStyles.labelSelected]}>{label}</Text>
            {selected && <Text style={chipStyles.check}>✓</Text>}
        </TouchableOpacity>
    );
}

const chipStyles = StyleSheet.create({
    chip: {
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    chipSelected: {
        backgroundColor: 'rgba(99,102,241,0.15)',
        borderColor: 'rgba(99,102,241,0.5)',
    },
    label: {
        fontSize: 14,
        fontWeight: '400',
        color: colors.text2,
    },
    labelSelected: {
        fontWeight: '600',
        color: colors.accent2,
    },
    emoji: { fontSize: 15 },
    check: { fontSize: 14, color: colors.accent2 },
});

function RoleCard({ label, selected, onPress, emoji }: { label: string; selected: boolean; onPress: () => void; emoji: string }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[roleStyles.card, selected && roleStyles.cardSelected]}
            activeOpacity={0.7}
        >
            <Text style={roleStyles.emoji}>{emoji}</Text>
            <Text style={[roleStyles.label, selected && roleStyles.labelSelected]}>{label}</Text>
            {selected && <View style={roleStyles.checkBadge}><Text style={roleStyles.checkText}>✓</Text></View>}
        </TouchableOpacity>
    );
}

const ROLE_EMOJIS: Record<string, string> = {
    'Student': '🎓',
    'Non-Technical Pro': '💼',
    'Technical Pro': '💻',
    'Founder': '🚀',
    'Creator & Marketer': '🎨',
};

const roleStyles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface2,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        width: '100%',
    },
    cardSelected: {
        backgroundColor: 'rgba(99,102,241,0.15)',
        borderColor: 'rgba(99,102,241,0.5)',
    },
    emoji: { fontSize: 22 },
    label: { fontSize: 15, fontWeight: '500', color: colors.text2, flex: 1 },
    labelSelected: { fontWeight: '700', color: colors.text1 },
    checkBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

const CATEGORY_EMOJIS: Record<string, string> = {
    'AI Writing': '✍️',
    'AI Images': '🎨',
    'Coding Copilots': '💻',
    'AI Research': '🔬',
    'Video & Audio': '🎬',
    'Career & Biz': '💼',
};

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const [step, setStep] = useState(0);
    const [user, setUser] = useState<UserProfile>({
        ...storageService.getUser(),
        onboardingComplete: false,
    });

    const toolNames = CURATED_TOOLS.map(t => t.name);

    const toggleArrayItem = (key: 'goals' | 'preferredCategories' | 'toolsKnown', value: string) => {
        setUser(prev => {
            const arr = [...prev[key]];
            const idx = arr.indexOf(value);
            if (idx >= 0) arr.splice(idx, 1);
            else arr.push(value);
            return { ...prev, [key]: arr };
        });
    };

    const canProceed = (): boolean => {
        switch (step) {
            case 0: return user.name.trim().length >= 2;
            case 1: return user.role !== '';
            case 2: return user.goals.length >= 1;
            case 3: return user.aiLevel !== '';
            case 4: return user.industry !== '';
            case 5: return true; // tools known + categories are optional
            default: return true;
        }
    };

    const handleNext = () => {
        if (step < TOTAL_STEPS - 1) {
            setStep(step + 1);
        } else {
            // Final step — save and complete
            const initials = user.name
                .trim()
                .split(/\s+/)
                .map(w => w[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

            const finalUser: UserProfile = {
                ...user,
                initials,
                onboardingComplete: true,
            };
            storageService.saveUser(finalUser);
            onComplete();
        }
    };

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
    };

    const renderStep = () => {
        switch (step) {
            case 0:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepEmoji}>👋</Text>
                        <Text style={styles.stepTitle}>What should we call you?</Text>
                        <Text style={styles.stepDescription}>
                            This personalises your experience across Delta.
                        </Text>
                        <TextInput
                            style={styles.nameInput}
                            placeholder="Your name"
                            placeholderTextColor={colors.text3}
                            value={user.name}
                            onChangeText={(name) => setUser(prev => ({ ...prev, name }))}
                            autoFocus
                            returnKeyType="next"
                            onSubmitEditing={() => canProceed() && handleNext()}
                        />
                    </View>
                );

            case 1:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepEmoji}>👤</Text>
                        <Text style={styles.stepTitle}>What best describes you?</Text>
                        <Text style={styles.stepDescription}>
                            This helps Delta recommend the right tools and content for your level.
                        </Text>
                        <View style={styles.rolesContainer}>
                            {ROLES.map(role => (
                                <RoleCard
                                    key={role}
                                    label={role}
                                    emoji={ROLE_EMOJIS[role] || '👤'}
                                    selected={user.role === role}
                                    onPress={() => setUser(prev => ({ ...prev, role }))}
                                />
                            ))}
                        </View>
                    </View>
                );

            case 2:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepEmoji}>🎯</Text>
                        <Text style={styles.stepTitle}>What are your goals?</Text>
                        <Text style={styles.stepDescription}>
                            Pick up to 3. This shapes your feed and learning path.
                        </Text>
                        <View style={styles.chipsRow}>
                            {GOALS.map(goal => (
                                <Chip
                                    key={goal}
                                    label={goal}
                                    selected={user.goals.includes(goal)}
                                    onPress={() => {
                                        if (user.goals.includes(goal) || user.goals.length < 3) {
                                            toggleArrayItem('goals', goal);
                                        }
                                    }}
                                />
                            ))}
                        </View>
                        {user.goals.length > 0 && (
                            <Text style={styles.selectionCount}>
                                {user.goals.length}/3 selected
                            </Text>
                        )}
                    </View>
                );

            case 3:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepEmoji}>📊</Text>
                        <Text style={styles.stepTitle}>How familiar are you with AI?</Text>
                        <Text style={styles.stepDescription}>
                            No wrong answers — this calibrates lesson difficulty and recommendations.
                        </Text>
                        <View style={styles.levelsContainer}>
                            {AI_LEVELS.map(level => {
                                const descriptions: Record<string, string> = {
                                    'Beginner': 'I\'ve heard of ChatGPT but haven\'t used AI tools much',
                                    'Familiar': 'I use ChatGPT or similar tools occasionally',
                                    'Regular User': 'AI tools are part of my weekly workflow',
                                    'Advanced': 'I use multiple AI tools daily and understand prompting deeply',
                                };
                                const isSelected = user.aiLevel === level;
                                return (
                                    <TouchableOpacity
                                        key={level}
                                        onPress={() => setUser(prev => ({ ...prev, aiLevel: level }))}
                                        style={[styles.levelCard, isSelected && styles.levelCardSelected]}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.levelTitle, isSelected && styles.levelTitleSelected]}>{level}</Text>
                                        <Text style={styles.levelDesc}>{descriptions[level]}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                );

            case 4:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepEmoji}>🏢</Text>
                        <Text style={styles.stepTitle}>What industry are you in?</Text>
                        <Text style={styles.stepDescription}>
                            This helps us surface AI news and tools relevant to your field.
                        </Text>
                        <View style={styles.chipsRow}>
                            {INDUSTRIES.map(ind => (
                                <Chip
                                    key={ind}
                                    label={ind}
                                    selected={user.industry === ind}
                                    onPress={() => setUser(prev => ({ ...prev, industry: ind }))}
                                />
                            ))}
                        </View>
                    </View>
                );

            case 5:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepEmoji}>🛠️</Text>
                        <Text style={styles.stepTitle}>Final touches</Text>
                        <Text style={styles.stepDescription}>
                            Select content categories and tools you already know. We'll skip the basics for tools you use.
                        </Text>

                        <Text style={styles.miniLabel}>CONTENT YOU WANT TO SEE</Text>
                        <View style={styles.chipsRow}>
                            {CONTENT_CATEGORIES.map(cat => (
                                <Chip
                                    key={cat}
                                    label={cat}
                                    emoji={CATEGORY_EMOJIS[cat]}
                                    selected={user.preferredCategories.includes(cat)}
                                    onPress={() => toggleArrayItem('preferredCategories', cat)}
                                />
                            ))}
                        </View>

                        <Text style={[styles.miniLabel, { marginTop: 24 }]}>TOOLS YOU ALREADY KNOW</Text>
                        <View style={styles.chipsRow}>
                            {toolNames.map(name => (
                                <Chip
                                    key={name}
                                    label={name}
                                    selected={user.toolsKnown.includes(name)}
                                    onPress={() => toggleArrayItem('toolsKnown', name)}
                                />
                            ))}
                        </View>

                        <Text style={[styles.miniLabel, { marginTop: 24 }]}>HOW YOU LEARN BEST</Text>
                        <View style={styles.chipsRow}>
                            {LEARNING_STYLES.map(style => (
                                <Chip
                                    key={style}
                                    label={style}
                                    selected={user.learningStyle === style}
                                    onPress={() => setUser(prev => ({ ...prev, learningStyle: style }))}
                                />
                            ))}
                        </View>
                    </View>
                );

            default:
                return null;
        }
    };

    return (
        <View style={styles.container}>
            {/* Status bar spacer */}
            <View style={{ height: 52 }} />

            {/* Top bar: progress + back */}
            <View style={styles.topBar}>
                {step > 0 ? (
                    <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
                        <Text style={styles.backBtnText}>←</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 36 }} />
                )}
                <View style={styles.progressRow}>
                    {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.progressDot,
                                i <= step ? styles.progressDotActive : {},
                            ]}
                        />
                    ))}
                </View>
                <Text style={styles.stepIndicator}>{step + 1}/{TOTAL_STEPS}</Text>
            </View>

            {/* Branding on first step */}
            {step === 0 && (
                <View style={styles.branding}>
                    <Text style={styles.logo}>△ DELTA</Text>
                    <Text style={styles.tagline}>AI Intelligence, Personalised for You</Text>
                </View>
            )}

            {/* Step Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {renderStep()}
            </ScrollView>

            {/* Bottom CTA */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    onPress={handleNext}
                    style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
                    activeOpacity={0.85}
                    disabled={!canProceed()}
                >
                    <Text style={styles.nextBtnText}>
                        {step === TOTAL_STEPS - 1 ? 'Get Started' : 'Continue'}
                    </Text>
                </TouchableOpacity>
                {step === TOTAL_STEPS - 1 && (
                    <Text style={styles.skipNote}>
                        You can always change these in Settings
                    </Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        gap: 12,
    },
    backBtn: {
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backBtnText: {
        color: colors.text2,
        fontSize: 16,
    },
    progressRow: {
        flex: 1,
        flexDirection: 'row',
        gap: 6,
    },
    progressDot: {
        flex: 1,
        height: 4,
        borderRadius: 100,
        backgroundColor: colors.surface3,
    },
    progressDotActive: {
        backgroundColor: colors.accent,
    },
    stepIndicator: {
        fontSize: 12,
        color: colors.text3,
        fontWeight: '600',
    },
    branding: {
        alignItems: 'center',
        marginBottom: 8,
    },
    logo: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.text1,
        letterSpacing: 3,
    },
    tagline: {
        fontSize: 13,
        color: colors.text3,
        marginTop: 6,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 30,
    },
    stepContent: {
        paddingHorizontal: 24,
        paddingTop: 12,
    },
    stepEmoji: {
        fontSize: 36,
        marginBottom: 12,
    },
    stepTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text1,
        marginBottom: 8,
        lineHeight: 28,
    },
    stepDescription: {
        fontSize: 14,
        color: colors.text3,
        lineHeight: 21,
        marginBottom: 24,
    },
    nameInput: {
        backgroundColor: colors.surface2,
        borderWidth: 1.5,
        borderColor: colors.border2,
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 18,
        fontSize: 17,
        color: colors.text1,
        fontWeight: '500',
    },
    rolesContainer: {
        gap: 10,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    selectionCount: {
        fontSize: 12,
        color: colors.accent2,
        marginTop: 12,
        fontWeight: '600',
    },
    levelsContainer: {
        gap: 10,
    },
    levelCard: {
        backgroundColor: colors.surface2,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 16,
    },
    levelCardSelected: {
        backgroundColor: 'rgba(99,102,241,0.15)',
        borderColor: 'rgba(99,102,241,0.5)',
    },
    levelTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text2,
        marginBottom: 4,
    },
    levelTitleSelected: {
        color: colors.text1,
    },
    levelDesc: {
        fontSize: 13,
        color: colors.text3,
        lineHeight: 19,
    },
    miniLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: colors.text3,
        marginBottom: 10,
    },
    bottomBar: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        paddingTop: 12,
    },
    nextBtn: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: colors.accent,
        alignItems: 'center',
    },
    nextBtnDisabled: {
        opacity: 0.4,
    },
    nextBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    skipNote: {
        textAlign: 'center',
        fontSize: 12,
        color: colors.text3,
        marginTop: 10,
    },
});
