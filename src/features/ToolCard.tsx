import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Bookmark } from 'lucide-react-native';
import { storageService } from '../entities/user/storageService';
import { LogoContainer } from '../shared/ui/LogoContainer';
import { ToolPricing } from '../shared/types/types';
import { colors, radius } from '../shared/platform/theme';

interface ToolCardTool {
    id: string;
    name: string;
    domain: string;
    category: string;
    tag: string;
    matchScore: number;
    logoUrl?: string;
    pricing?: ToolPricing;
}

interface ToolCardProps {
    tool: ToolCardTool;
    onClick?: () => void;
}

const categoryGradientColors: Record<string, string> = {
    'Writing':  colors.accent,
    'General':  colors.accent,
    'Images':   colors.red,
    'Coding':   colors.yellow,
    'Audio':    colors.red,
    'Research': colors.blue,
};

function pricingColor(model: string): string {
    if (model === 'free') return colors.green;
    if (model === 'paid') return colors.red;
    return colors.yellow;
}

function pricingBg(model: string): string {
    if (model === 'free') return colors.greenBg;
    if (model === 'paid') return 'rgba(248,113,113,0.1)';
    return colors.yellowBg;
}

export function ToolCard({ tool, onClick }: ToolCardProps) {
    const [saved, setSaved] = useState(() => storageService.isToolSaved(tool.id));
    const barColor = categoryGradientColors[tool.category] || colors.accent;

    return (
        <TouchableOpacity style={styles.card} onPress={onClick} activeOpacity={0.85}>
            {/* Colour bar */}
            <View style={[styles.colorBar, { backgroundColor: barColor }]} />

            {/* Bookmark + match badge (top-right) */}
            <View style={styles.topRight}>
                <TouchableOpacity
                    onPress={() => setSaved(storageService.toggleToolSave(tool.id))}
                    style={styles.bookmarkBtn}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                    <Bookmark size={12} fill={saved ? colors.yellow : 'none'} color={saved ? colors.yellow : '#fff'} />
                </TouchableOpacity>
                <View style={styles.matchBadge}>
                    <Text style={styles.matchText}>{tool.matchScore}%</Text>
                </View>
            </View>

            {/* Logo */}
            <LogoContainer domain={tool.domain} name={tool.name} size={36} category={tool.category} logoUrl={tool.logoUrl} />

            {/* Name */}
            <Text style={styles.name}>{tool.name}</Text>

            {/* Tag + pricing */}
            <View style={styles.tagRow}>
                <Text style={styles.tag} numberOfLines={1}>{tool.tag}</Text>
                {tool.pricing && (
                    <View style={[styles.pricingBadge, { backgroundColor: pricingBg(tool.pricing.model) }]}>
                        <Text style={[styles.pricingText, { color: pricingColor(tool.pricing.model) }]}>
                            {tool.pricing.model}
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        width: 140,
        flexShrink: 0,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.xl,
        padding: 14,
        paddingTop: 16,
        position: 'relative',
    },
    colorBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
    },
    topRight: {
        position: 'absolute',
        top: 10,
        right: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    bookmarkBtn: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    matchBadge: {
        backgroundColor: colors.greenBg,
        borderRadius: 20,
        paddingVertical: 2,
        paddingHorizontal: 6,
    },
    matchText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.green,
    },
    name: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.text1,
        marginTop: 10,
        marginBottom: 4,
    },
    tagRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tag: {
        fontSize: 10,
        color: colors.text3,
        flex: 1,
    },
    pricingBadge: {
        paddingVertical: 1,
        paddingHorizontal: 4,
        borderRadius: 4,
        marginLeft: 4,
    },
    pricingText: {
        fontSize: 8,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
});
