import React, { useState } from 'react';
import { deltaService, CURATED_TOOLS } from '../shared/api/deltaService';
import { storageService } from '../entities/user/storageService';
import { ToolData } from '../shared/types/types';
import { SectionLabel } from '../shared/ui/SectionLabel';
import { FilterChips } from '../shared/ui/FilterChips';
import { ToolListItem } from '../features/ToolListItem';
import { Search } from 'lucide-react';

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
        <div className="screen-container">
            {/* Status bar */}
            <div style={{ height: 44 }} />

            {/* Header */}
            <div style={{ padding: '8px 20px 16px' }}>
                <h1 style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 24,
                    fontWeight: 800,
                    color: 'var(--text-1)',
                    margin: 0,
                }}>Tools</h1>
                <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    color: 'var(--text-3)',
                    marginTop: 4,
                }}>Personalised to your profile · {user.role}</p>
            </div>

            {/* Search Bar */}
            <div style={{ margin: '0 20px 14px', position: 'relative' }}>
                <Search size={16} color="var(--text-3)" style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                }} />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search AI tools..."
                    style={{
                        width: '100%', height: 44,
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 14,
                        padding: '0 14px 0 40px',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13, color: 'var(--text-1)',
                        outline: 'none', transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-2)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                />
            </div>

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
                    <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                        {bestForYou.map(tool => (
                            <ToolListItem
                                key={tool.id}
                                tool={tool}
                                onClick={() => onSelectTool(tool)}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* New & Trending */}
            {filterCategory(newTools).length > 0 && (
                <>
                    <SectionLabel>🆕 NEW & TRENDING</SectionLabel>
                    <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                        {filterCategory(newTools).map(tool => (
                            <ToolListItem
                                key={tool.id}
                                tool={tool}
                                onClick={() => onSelectTool(tool)}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* All Tools */}
            <SectionLabel>🛠️ ALL TOOLS ({filterCategory(allTools).length})</SectionLabel>
            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filterCategory(allTools)
                    .sort((a, b) => b.matchScore - a.matchScore)
                    .map(tool => (
                        <ToolListItem
                            key={tool.id}
                            tool={tool}
                            onClick={() => onSelectTool(tool)}
                        />
                    ))}
            </div>

            <div style={{ height: 20 }} />
        </div>
    );
}
