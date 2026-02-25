import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { storageService, getLevelForXP, LEVELS } from '../entities/user/storageService';
import { SectionLabel } from '../shared/ui/SectionLabel';
import { X, Pencil, Share2 } from 'lucide-react-native';
import { colors, radius } from '../shared/platform/theme';

interface ProfileScreenProps {
    onClose: () => void;
    onOpenPreferences?: () => void;
}

const SKILLS = [
    { name: 'AI Writing', emoji: '✍️', percent: 72, color: colors.accent2 },
    { name: 'Prompt Engineering', emoji: '🧠', percent: 58, color: colors.blue },
    { name: 'AI Image Gen', emoji: '🎨', percent: 28, color: colors.pink },
    { name: 'Coding Copilots', emoji: '💻', percent: 45, color: colors.orange },
    { name: 'AI Research', emoji: '🔬', percent: 62, color: colors.green },
];

export function ProfileScreen({ onClose, onOpenPreferences }: ProfileScreenProps) {
    const user = storageService.getUser();
    const currentLevelIdx = LEVELS.findIndex(l => l.title === user.levelTitle);
    const nextLevel = LEVELS[currentLevelIdx + 1];

    const STATS = [
        { value: user.streak, label: 'Day Streak', emoji: '🔥', color: colors.orange },
        { value: user.xp, label: 'XP Earned', emoji: '⚡', color: colors.accent2 },
        { value: user.lessonsCompleted, label: 'Lessons Done', emoji: '📖', color: colors.green },
    ];

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Top bar */}
            <View style={styles.topBar}>
                <Text style={styles.pageTitle}>Profile</Text>
                <View style={styles.topBarActions}>
                    <TouchableOpacity onPress={onOpenPreferences} style={styles.iconBtn}>
                        <Pencil size={14} color={colors.text3} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                        <X size={14} color={colors.text3} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Profile Hero */}
            <View style={styles.hero}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{user.initials}</Text>
                </View>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userRole}>{user.role}</Text>
                <View style={styles.levelPill}>
                    <Text style={styles.levelPillText}>{user.levelTitle} · Level {user.level}</Text>
                </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                {STATS.map((stat) => (
                    <View key={stat.label} style={styles.statCard}>
                        <Text style={styles.statEmoji}>{stat.emoji}</Text>
                        <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                        <Text style={styles.statLabel}>{stat.label}</Text>
                    </View>
                ))}
            </View>

            {/* Share Button */}
            <View style={styles.section}>
                <TouchableOpacity style={styles.shareBtn}>
                    <Share2 size={16} color={colors.accent2} />
                    <Text style={styles.shareBtnText}>Share to LinkedIn</Text>
                </TouchableOpacity>
            </View>

            {/* Edit Preferences */}
            <View style={styles.section}>
                <TouchableOpacity onPress={onOpenPreferences} style={styles.prefBtn}>
                    <View style={styles.prefBtnLeft}>
                        <Text style={styles.prefEmoji}>⚙️</Text>
                        <View>
                            <Text style={styles.prefBtnTitle}>Edit Feed Preferences</Text>
                            <Text style={styles.prefBtnSub}>Role · Industry · Goals · Categories</Text>
                        </View>
                    </View>
                    <Text style={styles.prefArrow}>→</Text>
                </TouchableOpacity>
            </View>

            {/* AI Skill Stack */}
            <SectionLabel>🎯 YOUR AI SKILL STACK</SectionLabel>
            <View style={[styles.section, { gap: 14 }]}>
                {SKILLS.map((skill) => (
                    <View key={skill.name}>
                        <View style={styles.skillRow}>
                            <View style={styles.skillNameRow}>
                                <Text style={styles.skillEmoji}>{skill.emoji}</Text>
                                <Text style={styles.skillName}>{skill.name}</Text>
                            </View>
                            <Text style={styles.skillPercent}>{skill.percent}%</Text>
                        </View>
                        <View style={styles.skillTrack}>
                            <View style={[styles.skillBar, { width: `${skill.percent}%` as any, backgroundColor: skill.color }]} />
                        </View>
                    </View>
                ))}
            </View>

            {/* Level Journey */}
            <SectionLabel>🏆 LEVEL JOURNEY</SectionLabel>
            <View style={styles.section}>
                <View style={styles.levelSegments}>
                    {LEVELS.map((lv, i) => (
                        <View
                            key={lv.title}
                            style={[
                                styles.levelSegment,
                                { backgroundColor: i <= currentLevelIdx ? colors.accent : colors.surface3 },
                            ]}
                        />
                    ))}
                </View>
                <View style={styles.levelLabels}>
                    {LEVELS.map((lv, i) => (
                        <Text
                            key={lv.title}
                            style={[styles.levelLabel, { color: i <= currentLevelIdx ? colors.accent2 : colors.text3 }]}
                        >{lv.title}</Text>
                    ))}
                </View>
                {nextLevel && (
                    <Text style={styles.nextLevelText}>
                        {nextLevel.xp - user.xp} XP to reach {nextLevel.title}
                    </Text>
                )}
            </View>

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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 16,
    },
    pageTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.text1,
    },
    topBarActions: {
        flexDirection: 'row',
        gap: 8,
    },
    iconBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hero: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
    },
    userName: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text1,
    },
    userRole: {
        fontSize: 13,
        color: colors.text3,
        marginTop: 4,
    },
    levelPill: {
        marginTop: 8,
        backgroundColor: colors.accentBg,
        borderWidth: 1,
        borderColor: 'rgba(99,102,241,0.3)',
        borderRadius: radius.full,
        paddingHorizontal: 14,
        paddingVertical: 4,
    },
    levelPillText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.accent2,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        marginBottom: 28,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.xl,
        padding: 14,
        alignItems: 'center',
    },
    statEmoji: { fontSize: 16, marginBottom: 4 },
    statValue: { fontSize: 22, fontWeight: '800' },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.text3,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 2,
        textAlign: 'center',
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 28,
    },
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
    },
    shareBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.accent2,
    },
    prefBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(99,102,241,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(99,102,241,0.25)',
        borderRadius: radius.lg,
    },
    prefBtnLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    prefEmoji: { fontSize: 18 },
    prefBtnTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text1,
    },
    prefBtnSub: {
        fontSize: 11,
        color: colors.text3,
    },
    prefArrow: {
        fontSize: 16,
        color: colors.text3,
    },
    skillRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    skillNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    skillEmoji: { fontSize: 16 },
    skillName: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.text1,
    },
    skillPercent: {
        fontSize: 12,
        color: colors.text3,
    },
    skillTrack: {
        height: 6,
        backgroundColor: colors.surface3,
        borderRadius: 100,
        overflow: 'hidden',
    },
    skillBar: {
        height: 6,
        borderRadius: 100,
    },
    levelSegments: {
        flexDirection: 'row',
        gap: 4,
        marginBottom: 10,
    },
    levelSegment: {
        flex: 1,
        height: 8,
        borderRadius: 100,
    },
    levelLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    levelLabel: {
        fontSize: 8,
        flex: 1,
        textAlign: 'center',
    },
    nextLevelText: {
        fontSize: 12,
        color: colors.text3,
        textAlign: 'center',
        marginTop: 8,
    },
});
