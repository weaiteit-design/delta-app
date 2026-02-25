import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { storageService, getLevelForXP } from '../../entities/user/storageService';
import { colors, radius } from '../platform/theme';

export function StreakBar() {
    const user = storageService.getUser();
    const lvl = getLevelForXP(user.xp);
    const progress = lvl.nextXp > 0 ? Math.min((user.xp / lvl.nextXp) * 100, 100) : 100;

    return (
        <View style={styles.container}>
            <Text style={styles.fireEmoji}>🔥</Text>
            <View style={styles.content}>
                <View style={styles.titleRow}>
                    <Text style={styles.streakNum}>{user.streak}</Text>
                    <Text style={styles.streakLabel}>day streak</Text>
                </View>
                <Text style={styles.xpLabel}>
                    {user.xp} / {lvl.nextXp} XP · {lvl.title} Level
                </Text>
                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
                </View>
            </View>
            <View style={styles.levelBadge}>
                <Text style={styles.levelText}>Lv. {user.level}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 20,
        backgroundColor: colors.surface2,
        borderRadius: radius.xl,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    fireEmoji: {
        fontSize: 22,
    },
    content: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    streakNum: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.orange,
    },
    streakLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.text2,
    },
    xpLabel: {
        fontSize: 11,
        color: colors.text3,
        marginTop: 2,
        marginBottom: 6,
    },
    progressTrack: {
        height: 4,
        backgroundColor: colors.surface3,
        borderRadius: 100,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.accent2,
        borderRadius: 100,
    },
    levelBadge: {
        backgroundColor: colors.accentBg,
        borderWidth: 1,
        borderColor: 'rgba(99,102,241,0.3)',
        borderRadius: 10,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    levelText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.accent2,
    },
});
