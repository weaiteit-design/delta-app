import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { Bookmark } from 'lucide-react-native';
import { FomoScore } from '../shared/ui/FomoScore';
import { storageService } from '../entities/user/storageService';
import { colors, radius } from '../shared/platform/theme';

interface NewsCardItem {
    id: string;
    title: string;
    tag: string;
    type: 'tool-update' | 'new-tool' | 'trick' | 'workflow' | 'capability';
    source: string;
    timeAgo: string;
    fomoScore: number;
    url?: string;
}

interface NewsCardProps {
    item: NewsCardItem;
    onClick?: () => void;
}

function getNewsColor(type: string): string {
    switch (type) {
        case 'capability': return colors.red;
        case 'trick':      return colors.orange;
        case 'workflow':   return colors.blue;
        case 'new-tool':   return colors.green;
        case 'tool-update':return colors.accent2;
        default:           return colors.text3;
    }
}

function getTypeLabel(type: string): string {
    switch (type) {
        case 'capability':  return 'AI Capability';
        case 'trick':       return 'AI Trick';
        case 'workflow':    return 'Workflow';
        case 'new-tool':    return 'New Tool';
        case 'tool-update': return 'Tool Update';
        default:            return 'Delta Intelligence';
    }
}

export function NewsCard({ item, onClick }: NewsCardProps) {
    const [saved, setSaved] = useState(() => storageService.isArticleSaved(item.id));
    const dotColor = getNewsColor(item.type);
    const typeLabel = getTypeLabel(item.type);

    const handlePress = () => {
        if (onClick) {
            onClick();
        } else if (item.url) {
            Linking.openURL(item.url);
        }
    };

    return (
        <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.85}>
            {/* Type dot */}
            <View style={[styles.typeDot, { backgroundColor: dotColor }]} />

            {/* Content */}
            <View style={styles.content}>
                <Text style={[styles.tag, { color: dotColor }]}>{item.tag}</Text>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.meta}>{typeLabel} · {item.timeAgo}</Text>
            </View>

            {/* Right: bookmark + FOMO */}
            <View style={styles.right}>
                <TouchableOpacity
                    onPress={() => setSaved(storageService.toggleArticleSave(item.id))}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Bookmark
                        size={18}
                        fill={saved ? colors.yellow : 'none'}
                        color={saved ? colors.yellow : colors.text3}
                    />
                </TouchableOpacity>
                <FomoScore score={item.fomoScore} />
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
    },
    typeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 5,
        flexShrink: 0,
    },
    content: {
        flex: 1,
        minWidth: 0,
    },
    tag: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text1,
        lineHeight: 19,
        marginBottom: 4,
    },
    meta: {
        fontSize: 11,
        color: colors.text3,
    },
    right: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
});
