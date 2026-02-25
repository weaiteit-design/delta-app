import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
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

// ============================================
// PREFERENCES SCREEN
// Full personalisation overlay
// ============================================

interface PreferencesScreenProps {
    onClose: () => void;
    onSave?: () => void;
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
        marginTop: 24,
        marginBottom: 10,
        marginHorizontal: 20,
    },
    text: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: colors.text3,
    },
});

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
        paddingVertical: 8,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    chipSelected: {
        backgroundColor: 'rgba(99,102,241,0.15)',
        borderColor: 'rgba(99,102,241,0.5)',
    },
    label: {
        fontSize: 13,
        fontWeight: '400',
        color: colors.text2,
    },
    labelSelected: {
        fontWeight: '600',
        color: colors.accent2,
    },
    emoji: {
        fontSize: 14,
    },
    check: {
        fontSize: 14,
        color: colors.accent2,
    },
});

function RadioChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[radioStyles.chip, selected && radioStyles.chipSelected]}
            activeOpacity={0.7}
        >
            <View style={[radioStyles.radio, selected && radioStyles.radioSelected]}>
                {selected && <View style={radioStyles.radioInner} />}
            </View>
            <Text style={[radioStyles.label, selected && radioStyles.labelSelected]}>{label}</Text>
        </TouchableOpacity>
    );
}

const radioStyles = StyleSheet.create({
    chip: {
        backgroundColor: colors.surface2,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        width: '100%',
    },
    chipSelected: {
        backgroundColor: 'rgba(99,102,241,0.2)',
        borderColor: 'rgba(99,102,241,0.5)',
    },
    radio: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    radioSelected: {
        borderColor: colors.accent,
        backgroundColor: colors.accent,
    },
    radioInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fff',
    },
    label: {
        fontSize: 13,
        fontWeight: '400',
        color: colors.text2,
        flex: 1,
    },
    labelSelected: {
        fontWeight: '600',
        color: colors.text1,
    },
});

export function PreferencesScreen({ onClose, onSave }: PreferencesScreenProps) {
    const [user, setUser] = useState<UserProfile>(storageService.getUser());
    const [saved, setSaved] = useState(false);

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

    const handleSave = () => {
        storageService.saveUser(user);
        setSaved(true);
        setTimeout(() => {
            setSaved(false);
            onSave?.();
            onClose();
        }, 800);
    };

    const CATEGORY_EMOJIS: Record<string, string> = {
        'AI Writing': '✍️',
        'AI Images': '🎨',
        'Coding Copilots': '💻',
        'AI Research': '🔬',
        'Video & Audio': '🎬',
        'Career & Biz': '💼',
    };

    return (
        <View style={styles.container}>
            {/* Status bar area */}
            <View style={{ height: 44 }} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.backBtn}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.backBtnText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Preferences</Text>
                </View>
            </View>

            {/* Scrollable content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Intro */}
                <Text style={styles.intro}>
                    These drive what updates, tools, and lessons you see. The more specific you are, the more relevant your feed becomes.
                </Text>

                {/* Role */}
                <SectionLabel>👤 YOUR ROLE</SectionLabel>
                <View style={styles.chipsContainer}>
                    {ROLES.map(role => (
                        <RadioChip
                            key={role}
                            label={role}
                            selected={user.role === role}
                            onPress={() => setUser(prev => ({ ...prev, role }))}
                        />
                    ))}
                </View>

                {/* Industry */}
                <SectionLabel>🏢 YOUR INDUSTRY</SectionLabel>
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

                {/* Goals */}
                <SectionLabel>🎯 YOUR GOALS (pick up to 3)</SectionLabel>
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

                {/* AI Level */}
                <SectionLabel>📊 YOUR AI LEVEL</SectionLabel>
                <View style={styles.chipsRow}>
                    {AI_LEVELS.map(lvl => (
                        <Chip
                            key={lvl}
                            label={lvl}
                            selected={user.aiLevel === lvl}
                            onPress={() => setUser(prev => ({ ...prev, aiLevel: lvl }))}
                        />
                    ))}
                </View>

                {/* Learning Style */}
                <SectionLabel>📖 HOW YOU LEARN BEST</SectionLabel>
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

                {/* Preferred Categories */}
                <SectionLabel>📚 CONTENT YOU WANT TO SEE</SectionLabel>
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

                {/* Tools Already Known */}
                <SectionLabel>🛠️ TOOLS YOU ALREADY KNOW</SectionLabel>
                <Text style={styles.toolsHint}>
                    We won't recommend basics for tools you already use.
                </Text>
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

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Save Button — fixed at bottom */}
            <View style={styles.saveContainer}>
                <TouchableOpacity
                    onPress={handleSave}
                    style={[styles.saveBtn, saved && styles.saveBtnSaved]}
                    activeOpacity={0.85}
                >
                    <Text style={styles.saveBtnText}>
                        {saved ? '✓ Saved!' : 'Save Preferences'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
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
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
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
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    intro: {
        fontSize: 13,
        color: colors.text3,
        paddingHorizontal: 20,
        lineHeight: 19.5,
    },
    chipsContainer: {
        paddingHorizontal: 20,
        gap: 8,
    },
    chipsRow: {
        paddingHorizontal: 20,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    toolsHint: {
        fontSize: 12,
        color: colors.text3,
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    saveContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: 16,
        paddingTop: 40,
        backgroundColor: colors.bg,
    },
    saveBtn: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: colors.accent,
        alignItems: 'center',
    },
    saveBtnSaved: {
        backgroundColor: '#10b981',
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});
