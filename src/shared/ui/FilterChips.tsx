import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../platform/theme';

interface FilterChipsProps {
    chips: string[];
    active: string;
    onSelect: (chip: string) => void;
}

export function FilterChips({ chips, active, onSelect }: FilterChipsProps) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
            style={styles.scroll}
        >
            {chips.map((chip) => {
                const isActive = chip === active;
                return (
                    <TouchableOpacity
                        key={chip}
                        onPress={() => onSelect(chip)}
                        style={[
                            styles.chip,
                            isActive ? styles.chipActive : styles.chipInactive,
                        ]}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.chipText, isActive ? styles.chipTextActive : styles.chipTextInactive]}>
                            {chip}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll: {
        marginBottom: 14,
    },
    container: {
        paddingHorizontal: 20,
        gap: 8,
        flexDirection: 'row',
    },
    chip: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: radius.full,
        borderWidth: 1,
    },
    chipActive: {
        backgroundColor: colors.accentBg,
        borderColor: 'rgba(99,102,241,0.4)',
    },
    chipInactive: {
        backgroundColor: colors.surface2,
        borderColor: colors.border2,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '500',
    },
    chipTextActive: {
        color: colors.accent2,
    },
    chipTextInactive: {
        color: colors.text2,
    },
});
