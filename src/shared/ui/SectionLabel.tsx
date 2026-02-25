import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../platform/theme';

interface SectionLabelProps {
    children: React.ReactNode;
}

export function SectionLabel({ children }: SectionLabelProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>{children}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: colors.text3,
    },
});
