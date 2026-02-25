import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Play, Clock } from 'lucide-react-native';
import { colors, radius } from '../shared/platform/theme';

interface LessonCardLesson {
    id: string;
    title: string;
    duration: string;
    xp: number;
    difficulty: number;
    preview: string;
    pill: string;
}

interface LessonCardProps {
    lesson: LessonCardLesson;
    onStartLesson?: () => void;
}

export function LessonCard({ lesson, onStartLesson }: LessonCardProps) {
    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onStartLesson}
            activeOpacity={0.9}
        >
            {/* Header Zone */}
            <View style={styles.header}>
                {/* Pill */}
                <View style={styles.pill}>
                    <Text style={styles.pillText}>{lesson.pill}</Text>
                </View>

                {/* Title + meta */}
                <View style={styles.titleBlock}>
                    <Text style={styles.title} numberOfLines={2}>{lesson.title}</Text>
                    <View style={styles.metaRow}>
                        <Clock size={12} color="rgba(255,255,255,0.5)" />
                        <Text style={styles.duration}>{lesson.duration}</Text>
                        <View style={styles.xpBadge}>
                            <Text style={styles.xpText}>+{lesson.xp} XP</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Body Zone */}
            <View style={styles.body}>
                <Text style={styles.preview} numberOfLines={3}>{lesson.preview}</Text>
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.startBtn} onPress={onStartLesson} activeOpacity={0.8}>
                        <Play size={14} color="#fff" fill="#fff" />
                        <Text style={styles.startBtnText}>Start Lesson</Text>
                    </TouchableOpacity>
                    <View style={styles.difficultyDots}>
                        {[1, 2, 3].map((dot) => (
                            <View
                                key={dot}
                                style={[styles.dot, { backgroundColor: dot <= lesson.difficulty ? colors.accent2 : colors.surface3 }]}
                            />
                        ))}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: radius.xxl,
        borderWidth: 1,
        borderColor: colors.border2,
        overflow: 'hidden',
    },
    header: {
        height: 120,
        backgroundColor: '#16213e',
        padding: 16,
        justifyContent: 'space-between',
    },
    pill: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(99,102,241,0.2)',
        borderWidth: 1,
        borderColor: 'rgba(99,102,241,0.3)',
        borderRadius: radius.full,
        paddingVertical: 3,
        paddingHorizontal: 10,
    },
    pillText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.accent2,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    titleBlock: {},
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
        lineHeight: 22,
        marginBottom: 6,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    duration: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        marginLeft: 4,
    },
    xpBadge: {
        backgroundColor: colors.yellowBg,
        borderRadius: 10,
        paddingVertical: 1,
        paddingHorizontal: 7,
        marginLeft: 4,
    },
    xpText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.yellow,
    },
    body: {
        padding: 14,
        backgroundColor: colors.surface,
    },
    preview: {
        fontSize: 13,
        color: colors.text2,
        lineHeight: 19,
        marginBottom: 14,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    startBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.accent,
        borderRadius: 14,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    startBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
    },
    difficultyDots: {
        flexDirection: 'row',
        gap: 5,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
});
