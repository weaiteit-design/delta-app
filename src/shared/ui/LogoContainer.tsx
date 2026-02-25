import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../platform/theme';

interface LogoContainerProps {
    domain: string;
    name: string;
    size: 26 | 36 | 44;
    category?: string;
    logoUrl?: string;
    style?: ViewStyle;
}

const CATEGORY_TINTS: Record<string, string> = {
    'Writing':  'rgba(99,102,241,0.18)',
    'General':  'rgba(99,102,241,0.15)',
    'Coding':   'rgba(251,146,60,0.18)',
    'Research': 'rgba(96,165,250,0.18)',
    'Images':   'rgba(248,113,113,0.15)',
    'Audio':    'rgba(52,211,153,0.15)',
};

export function LogoContainer({ domain, name, size, category, logoUrl, style }: LogoContainerProps) {
    const [imgError, setImgError] = useState(false);
    const borderRadius = size >= 44 ? 12 : size >= 36 ? 10 : 8;
    const initials = name.slice(0, 2).toUpperCase();
    const tint = CATEGORY_TINTS[category || ''] || 'rgba(99,102,241,0.12)';
    const imgSize = Math.round(size * 0.65);

    const imgSrc = logoUrl
        ? logoUrl
        : `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

    return (
        <View style={[{ width: size, height: size, borderRadius, backgroundColor: tint }, styles.wrapper, style]}>
            {!imgError ? (
                <Image
                    source={{ uri: imgSrc }}
                    style={{ width: imgSize, height: imgSize, borderRadius: Math.round(borderRadius * 0.6) }}
                    resizeMode="contain"
                    onError={() => setImgError(true)}
                />
            ) : (
                <Text style={[styles.initials, { fontSize: Math.round(size * 0.32) }]}>
                    {initials}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
    },
    initials: {
        fontWeight: '700',
        color: colors.text3,
    },
});
