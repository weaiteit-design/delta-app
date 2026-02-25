import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LogoContainer } from '../shared/ui/LogoContainer';
import { ToolPricing } from '../shared/types/types';
import { colors, radius } from '../shared/platform/theme';

interface ToolListTool {
    id: string;
    name: string;
    domain: string;
    description: string;
    category: string;
    matchScore: number;
    mastery: number;
    isNew?: boolean;
    logoUrl?: string;
    pricing?: ToolPricing;
}

interface ToolListItemProps {
    tool: ToolListTool;
    onClick?: () => void;
}

function pricingColor(model: string) { return model === 'free' ? colors.green : model === 'paid' ? colors.red : colors.yellow; }
function pricingBg(model: string) { return model === 'free' ? colors.greenBg : model === 'paid' ? 'rgba(248,113,113,0.1)' : colors.yellowBg; }

export function ToolListItem({ tool, onClick }: ToolListItemProps) {
    return (
        <TouchableOpacity style={styles.card} onPress={onClick} activeOpacity={0.85}>
            <LogoContainer domain={tool.domain} name={tool.name} size={44} category={tool.category} logoUrl={tool.logoUrl} />

            <View style={styles.info}>
                <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>{tool.name}</Text>
                    {tool.pricing && (
                        <View style={[styles.pricingBadge, { backgroundColor: pricingBg(tool.pricing.model) }]}>
                            <Text style={[styles.pricingText, { color: pricingColor(tool.pricing.model) }]}>
                                {tool.pricing.model}
                            </Text>
                        </View>
                    )}
                </View>
                <Text style={styles.description} numberOfLines={1}>{tool.description}</Text>
                {tool.pricing?.startingPrice && (
                    <Text style={styles.price}>
                        {tool.pricing.model === 'freemium' ? 'Free + ' : 'From '}{tool.pricing.startingPrice}
                    </Text>
                )}
            </View>

            <View style={styles.right}>
                {tool.isNew ? (
                    <Text style={styles.newBadge}>New</Text>
                ) : (
                    <Text style={styles.matchScore}>{tool.matchScore}% match</Text>
                )}
                <View style={styles.masteryDots}>
                    {[1, 2, 3].map((dot) => (
                        <View key={dot} style={[styles.dot, { backgroundColor: dot <= tool.mastery ? colors.accent2 : colors.surface3 }]} />
                    ))}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.xl,
        flexDirection: 'row',
        gap: 14,
        alignItems: 'center',
    },
    info: { flex: 1, minWidth: 0, paddingRight: 8 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    name: { fontSize: 14, fontWeight: '700', color: colors.text1, flexShrink: 1 },
    pricingBadge: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 6 },
    pricingText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
    description: { fontSize: 11, color: colors.text3 },
    price: { fontSize: 10, color: colors.text3, marginTop: 4 },
    right: { flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 },
    newBadge: { fontSize: 11, fontWeight: '700', color: colors.blue, backgroundColor: colors.blueBg, borderRadius: 10, paddingVertical: 1, paddingHorizontal: 8 },
    matchScore: { fontSize: 11, fontWeight: '700', color: colors.green },
    masteryDots: { flexDirection: 'row', gap: 4 },
    dot: { width: 5, height: 5, borderRadius: 3 },
});
