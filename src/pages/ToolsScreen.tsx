import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { deltaService, CURATED_TOOLS } from '../shared/api/deltaService';
import { storageService } from '../entities/user/storageService';
import { ToolData } from '../shared/types/types';
import { SectionLabel } from '../shared/ui/SectionLabel';
import { FilterChips } from '../shared/ui/FilterChips';
import { ToolListItem } from '../features/ToolListItem';
import { Search } from 'lucide-react-native';
import { colors, radius } from '../shared/platform/theme';

interface ToolsScreenProps {
    onSelectTool: (tool: ToolData) => void;
}

// ---- Personalised tool scoring ----
function scoreToolForUser(tool: ToolData, user: ReturnType<typeof storageService.getUser>): number {
    let score = 50; // base

    // Boost for matching user's preferred categories
    const CATEGORY_PREF_MAP: Record<string, string[]> = {
        'AI Writing': ['Writing'],
        'AI Images': ['Images'],
        'Coding Copilots': ['Coding'],
        'AI Research': ['Research'],
        'Video & Audio': ['Video', 'Audio'],
        'Career & Biz': ['General'],
    };
    for (const pref of user.preferredCategories) {
        const cats = CATEGORY_PREF_MAP[pref] || [];
        if (cats.includes(tool.category)) {
            score += 25;
            break;
        }
    }

    // Boost for matching user's role via bestFor
    if (tool.bestFor) {
        const roleMap: Record<string, string[]> = {
            'Student': ['Students', 'Beginners'],
            'Non-Technical Pro': ['Non-Technical', 'Marketers', 'Teams'],
            'Technical Pro': ['Developers', 'Power Users'],
            'Founder': ['Founders', 'Builders'],
            'Creator & Marketer': ['Creators', 'Marketers', 'Content Makers', 'Designers'],
            'Creator & Builder': ['Creators', 'Builders', 'Developers'],
        };
        const userRoles = roleMap[user.role] || [];
        if (tool.bestFor.some(r => userRoles.includes(r))) {
            score += 20;
        }
    }

    // Demote tools user already knows (still show, just lower)
    if (user.toolsKnown.includes(tool.name)) {
        score -= 15;
    }

    // Small boost for matching user's goals
    const goalKeywords: Record<string, string[]> = {
        'Productivity': ['automation', 'workflow', 'assistant'],
        'Career Growth': ['enterprise', 'professional'],
        'Learning Fundamentals': ['beginner', 'learning'],
        'Building Products': ['prototyping', 'mvp', 'app builder', 'code'],
        'Content Creation': ['content', 'video', 'music', 'image', 'writing', 'voice'],
        'Automation': ['automation', 'api', 'workflow'],
    };
    for (const goal of user.goals) {
        const kws = goalKeywords[goal] || [];
        const toolText = (tool.description + ' ' + (tool.useCases || []).join(' ')).toLowerCase();
        if (kws.some(k => toolText.includes(k))) {
            score += 10;
            break;
        }
    }

    return Math.min(100, Math.max(0, score));
}

export function ToolsScreen({ onSelectTool }: ToolsScreenProps) {
    const [filter, setFilter] = useState('All');
    const [search, setSearch] = useState('');

    const user = storageService.getUser();
    const allTools = CURATED_TOOLS.map(t => ({
        ...t,
        matchScore: scoreToolForUser(t, user),
    }));

    // Sections
    const bestForYou = [...allTools]
        .filter(t => !user.toolsKnown.includes(t.name))
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 5);

    const newTools = allTools.filter(t => t.isNew);

    const filterCategory = (tools: typeof allTools) => {
        let result = tools;
        if (filter !== 'All') {
            result = result.filter(t => {
                if (filter === 'Writing') return t.category === 'Writing';
                if (filter === 'Research') return t.category === 'Research';
                if (filter === 'Images') return t.category === 'Images';
                if (filter === 'Coding') return t.category === 'Coding';
                if (filter === 'Audio') return t.category === 'Audio';
                return true;
            });
        }
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(t =>
                t.name.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q) ||
                t.tag.toLowerCase().includes(q) ||
                t.category.toLowerCase().includes(q)
            );
        }
        return result;
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Status bar */}
            <View style={{ height: 44 }} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Tools</Text>
                <Text style={styles.headerSubtitle}>Personalised to your profile · {user.role}</Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchIconWrapper}>
                    <Search size={16} color={colors.text3} />
                </View>
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search AI tools..."
                    placeholderTextColor={colors.text3}
                    style={styles.searchInput}
                />
            </View>

            {/* Filter Chips */}
            <FilterChips
                chips={['All', 'Writing', 'Research', 'Images', 'Coding', 'Audio']}
                active={filter}
                onSelect={setFilter}
            />

            {/* Best For You */}
            {!search && filter === 'All' && (
                <>
                    <SectionLabel>⚡ BEST FOR YOU</SectionLabel>
                    <View style={styles.toolsList}>
                        {bestForYou.map(tool => (
                            <ToolListItem
                                key={tool.id}
                                tool={tool}
                                onClick={() => onSelectTool(tool)}
                            />
                        ))}
                    </View>
                </>
            )}

            {/* New & Trending */}
            {filterCategory(newTools).length > 0 && (
                <>
                    <SectionLabel>🆕 NEW & TRENDING</SectionLabel>
                    <View style={styles.toolsList}>
                        {filterCategory(newTools).map(tool => (
                            <ToolListItem
                                key={tool.id}
                                tool={tool}
                                onClick={() => onSelectTool(tool)}
                            />
                        ))}
                    </View>
                </>
            )}

            {/* All Tools */}
            <SectionLabel>🛠️ ALL TOOLS ({filterCategory(allTools).length})</SectionLabel>
            <View style={styles.toolsListLast}>
                {filterCategory(allTools)
                    .sort((a, b) => b.matchScore - a.matchScore)
                    .map(tool => (
                        <ToolListItem
                            key={tool.id}
                            tool={tool}
                            onClick={() => onSelectTool(tool)}
                        />
                    ))}
            </View>

            <View style={{ height: 20 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text1,
    },
    headerSubtitle: {
        fontSize: 13,
        color: colors.text3,
        marginTop: 4,
    },
    searchContainer: {
        marginHorizontal: 20,
        marginBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        height: 44,
    },
    searchIconWrapper: {
        paddingLeft: 14,
        paddingRight: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
        height: 44,
        fontSize: 13,
        color: colors.text1,
        paddingRight: 14,
    },
    toolsList: {
        paddingHorizontal: 20,
        gap: 10,
        marginBottom: 28,
    },
    toolsListLast: {
        paddingHorizontal: 20,
        gap: 10,
    },
});
