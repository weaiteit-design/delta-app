import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ReviewData } from '../types/types';
import { colors, radius } from '../platform/theme';

interface ReviewCardProps {
    review: ReviewData;
}

export function ReviewCard({ review }: ReviewCardProps) {
    const stars = Array.from({ length: 5 }, (_, i) => i < review.rating ? '★' : '☆').join('');
    const initials = review.user_initials || 'DU';
    const date = review.created_at
        ? new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : '';

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.stars}>{stars}</Text>
                    {date ? <Text style={styles.date}>{date}</Text> : null}
                </View>
            </View>

            {review.use_case ? (
                <Text style={styles.useCase}>"{review.use_case}"</Text>
            ) : null}

            {review.pros && review.pros.length > 0 && (
                <View style={styles.chipsRow}>
                    {review.pros.slice(0, 3).map((p, i) => (
                        <View key={i} style={styles.proChip}>
                            <Text style={styles.proChipText}>✓ {p}</Text>
                        </View>
                    ))}
                </View>
            )}

            {review.cons && review.cons.length > 0 && (
                <View style={styles.chipsRow}>
                    {review.cons.slice(0, 2).map((c, i) => (
                        <View key={i} style={styles.conChip}>
                            <Text style={styles.conChipText}>✗ {c}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 20,
        padding: 14,
        gap: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(99,102,241,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.accent2,
    },
    stars: {
        fontSize: 14,
        color: colors.yellow,
        letterSpacing: 1,
    },
    date: {
        fontSize: 11,
        color: colors.text3,
        marginTop: 1,
    },
    useCase: {
        fontSize: 13,
        color: colors.text2,
        fontStyle: 'italic',
        lineHeight: 20,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    proChip: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: radius.full,
        backgroundColor: 'rgba(52,211,153,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(52,211,153,0.25)',
    },
    proChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.green,
    },
    conChip: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: radius.full,
        backgroundColor: 'rgba(248,113,113,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(248,113,113,0.25)',
    },
    conChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.red,
    },
});
