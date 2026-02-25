import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { storageService } from '../entities/user/storageService';
import { getTools, searchTools, getNewTools } from '../shared/api/toolsService';
import { CURATED_TOOLS } from '../shared/api/deltaService';
import { ToolData } from '../shared/types/types';
import { SectionLabel } from '../shared/ui/SectionLabel';
import { FilterChips } from '../shared/ui/FilterChips';
import { ToolListItem } from '../features/ToolListItem';
import { Search } from 'lucide-react-native';
import { colors, radius } from '../shared/platform/theme';

interface ToolsScreenProps {
    onSelectTool: (tool: ToolData) => void;
}

// Local scoring for curated fallback tools (applied when matchScore is at base 50)
function scoreToolForUser(tool: ToolData, user: ReturnType<typeof storageService.getUser>): number {
    let score = tool.matchScore || 50;
    if (score !== 50) return score; // Already scored by backend

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
        if (cats.includes(tool.category)) { score += 25; break; }
    }

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
        if (tool.bestFor.some(r => userRoles.includes(r))) score += 20;
    }

    if (user.toolsKnown.includes(tool.name)) score -= 15;

    return Math.min(100, Math.max(0, score));
}

function applyFilter(tools: ToolData[], filter: string, search: string): ToolData[] {
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
}

export function ToolsScreen({ onSelectTool }: ToolsScreenProps) {
    const [filter, setFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [allTools, setAllTools] = useState<ToolData[]>([]);
    const [newTools, setNewTools] = useState<ToolData[]>([]);
    const [searchResults, setSearchResults] = useState<ToolData[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);

    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const user = storageService.getUser();

    // Load tools on mount
    useEffect(() => {
        let mounted = true;
        async function load() {
            setLoading(true);
            const [tools, fresh] = await Promise.all([getTools(), getNewTools()]);
            if (!mounted) return;
            // Apply local scoring for curated fallback tools
            const scored = tools.map(t => ({ ...t, matchScore: scoreToolForUser(t, user) }));
            setAllTools(scored);
            setNewTools(fresh.map(t => ({ ...t, matchScore: scoreToolForUser(t, user) })));
            setLoading(false);
        }
        load();
        return () => { mounted = false; };
    }, []);

    // Debounced search (300ms) — DB search when configured, local filter otherwise
    useEffect(() => {
        if (!search.trim()) {
            setSearchResults(null);
            setSearching(false);
            return;
        }

        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        setSearching(true);

        searchTimerRef.current = setTimeout(async () => {
            const results = await searchTools(search);
            const scored = results.map(t => ({ ...t, matchScore: scoreToolForUser(t, user) }));
            setSearchResults(scored);
            setSearching(false);
        }, 300);

        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        };
    }, [search]);

    const displayTools = searchResults ?? allTools;
    const bestForYou = [...allTools]
        .filter(t => !user.toolsKnown.includes(t.name))
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 5);

    const filteredDisplay = applyFilter(displayTools, filter, searchResults ? '' : '');
    const filteredNew = applyFilter(newTools, filter, '');

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
                    {searching
                        ? <ActivityIndicator size="small" color={colors.accent2} />
                        : <Search size={16} color={colors.text3} />
                    }
                </View>
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search AI tools..."
                    placeholderTextColor={colors.text3}
                    style={styles.searchInput}
                />
                {search.length > 0 && (
                    <Text
                        onPress={() => { setSearch(''); setSearchResults(null); }}
                        style={styles.clearBtn}
                    >
                        ✕
                    </Text>
                )}
            </View>

            {/* Filter Chips */}
            <FilterChips
                chips={['All', 'Writing', 'Research', 'Images', 'Coding', 'Audio']}
                active={filter}
                onSelect={setFilter}
            />

            {/* Loading skeleton */}
            {loading && (
                <View style={styles.skeletonContainer}>
                    {[1, 2, 3].map(i => <View key={i} style={styles.skeletonCard} />)}
                </View>
            )}

            {!loading && (
                <>
                    {/* Search results */}
                    {searchResults !== null ? (
                        <>
                            <SectionLabel>
                                {searching ? '🔍 SEARCHING...' : `🔍 RESULTS (${filteredDisplay.length})`}
                            </SectionLabel>
                            {filteredDisplay.length === 0 && !searching ? (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyEmoji}>🤷</Text>
                                    <Text style={styles.emptyTitle}>No tools found</Text>
                                    <Text style={styles.emptyHint}>
                                        Try a different term — e.g. "writing", "code", or "image"
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.toolsList}>
                                    {filteredDisplay.map(tool => (
                                        <ToolListItem
                                            key={tool.id}
                                            tool={tool}
                                            onClick={() => onSelectTool(tool)}
                                        />
                                    ))}
                                </View>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Best For You */}
                            {filter === 'All' && bestForYou.length > 0 && (
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
                            {filteredNew.length > 0 && (
                                <>
                                    <SectionLabel>🆕 NEW & TRENDING</SectionLabel>
                                    <View style={styles.toolsList}>
                                        {filteredNew.map(tool => (
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
                            <SectionLabel>
                                🛠️ ALL TOOLS ({applyFilter(allTools, filter, '').length})
                            </SectionLabel>
                            <View style={styles.toolsListLast}>
                                {applyFilter(allTools, filter, '')
                                    .sort((a, b) => b.matchScore - a.matchScore)
                                    .map(tool => (
                                        <ToolListItem
                                            key={tool.id}
                                            tool={tool}
                                            onClick={() => onSelectTool(tool)}
                                        />
                                    ))}
                            </View>
                        </>
                    )}
                </>
            )}

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
        width: 38,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
        height: 44,
        fontSize: 13,
        color: colors.text1,
    },
    clearBtn: {
        paddingHorizontal: 14,
        fontSize: 14,
        color: colors.text3,
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
    skeletonContainer: {
        paddingHorizontal: 20,
        gap: 10,
        marginTop: 8,
    },
    skeletonCard: {
        height: 72,
        backgroundColor: colors.surface2,
        borderRadius: 16,
        opacity: 0.6,
    },
    emptyState: {
        paddingHorizontal: 20,
        paddingVertical: 32,
        alignItems: 'center',
    },
    emptyEmoji: {
        fontSize: 32,
        marginBottom: 12,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text1,
        marginBottom: 6,
    },
    emptyHint: {
        fontSize: 13,
        color: colors.text3,
        textAlign: 'center',
        lineHeight: 20,
    },
});
