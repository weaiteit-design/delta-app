import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../platform/theme';

interface FomoScoreProps {
    score: number;
}

export function FomoScore({ score }: FomoScoreProps) {
    const bg = score >= 8 ? colors.red : score >= 5 ? colors.orange : colors.blue;

    return (
        <View style={[styles.badge, { backgroundColor: bg }]}>
            <Text style={styles.text}>{score}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontFamily: 'Courier',
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
    },
});
