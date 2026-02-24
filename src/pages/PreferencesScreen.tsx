import React, { useState, useEffect } from 'react';
import {
    storageService,
    UserProfile,
    ROLES,
    INDUSTRIES,
    GOALS,
    AI_LEVELS,
    LEARNING_STYLES,
    CONTENT_CATEGORIES,
} from '../entities/user/storageService';
import { CURATED_TOOLS } from '../shared/api/deltaService';

// ============================================
// PREFERENCES SCREEN
// Full personalisation overlay
// ============================================

interface PreferencesScreenProps {
    onClose: () => void;
    onSave?: () => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            color: 'var(--text-3)',
            margin: '24px 20px 10px',
        }}>{children}</div>
    );
}

function Chip({ label, selected, onClick, emoji }: { label: string; selected: boolean; onClick: () => void; emoji?: string }) {
    return (
        <button
            onClick={onClick}
            style={{
                background: selected ? 'rgba(99,102,241,0.15)' : 'var(--surface-2)',
                border: `1px solid ${selected ? 'rgba(99,102,241,0.5)' : 'var(--border)'}`,
                borderRadius: 20,
                padding: '8px 14px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: selected ? 600 : 400,
                color: selected ? 'var(--accent-2)' : 'var(--text-2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
            }}
        >
            {emoji && <span>{emoji}</span>}
            {label}
            {selected && <span style={{ fontSize: 14 }}>✓</span>}
        </button>
    );
}

function RadioChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                background: selected
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.15) 100%)'
                    : 'var(--surface-2)',
                border: `1.5px solid ${selected ? 'rgba(99,102,241,0.5)' : 'var(--border)'}`,
                borderRadius: 14,
                padding: '12px 16px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: selected ? 600 : 400,
                color: selected ? 'var(--text-1)' : 'var(--text-2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                width: '100%',
                textAlign: 'left' as const,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
            }}
        >
            <span style={{
                width: 18, height: 18,
                borderRadius: '50%',
                border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                background: selected ? 'var(--accent)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s ease',
            }}>
                {selected && <span style={{ color: 'white', fontSize: 10 }}>●</span>}
            </span>
            {label}
        </button>
    );
}

export function PreferencesScreen({ onClose, onSave }: PreferencesScreenProps) {
    const [user, setUser] = useState<UserProfile>(storageService.getUser());
    const [saved, setSaved] = useState(false);

    const toolNames = CURATED_TOOLS.map(t => t.name);

    const toggleArrayItem = (key: 'goals' | 'preferredCategories' | 'toolsKnown', value: string) => {
        setUser(prev => {
            const arr = [...prev[key]];
            const idx = arr.indexOf(value);
            if (idx >= 0) arr.splice(idx, 1);
            else arr.push(value);
            return { ...prev, [key]: arr };
        });
    };

    const handleSave = () => {
        storageService.saveUser(user);
        setSaved(true);
        setTimeout(() => {
            setSaved(false);
            onSave?.();
            onClose();
        }, 800);
    };

    const CATEGORY_EMOJIS: Record<string, string> = {
        'AI Writing': '✍️',
        'AI Images': '🎨',
        'Coding Copilots': '💻',
        'AI Research': '🔬',
        'Video & Audio': '🎬',
        'Career & Biz': '💼',
    };

    return (
        <div className="screen-container" style={{ position: 'relative' }}>
            {/* Status bar area */}
            <div style={{ height: 44 }} />

            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 20px 16px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={onClose} style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        width: 36, height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--text-2)',
                        fontSize: 16,
                    }}>←</button>
                    <h1 style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 22,
                        fontWeight: 800,
                        color: 'var(--text-1)',
                        margin: 0,
                    }}>Preferences</h1>
                </div>
            </div>

            {/* Scrollable content */}
            <div style={{
                overflowY: 'auto',
                flex: 1,
                paddingBottom: 100,
            }}>
                {/* Intro */}
                <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    color: 'var(--text-3)',
                    padding: '0 20px',
                    margin: 0,
                    lineHeight: 1.5,
                }}>
                    These drive what updates, tools, and lessons you see. The more specific you are, the more relevant your feed becomes.
                </p>

                {/* Role */}
                <SectionLabel>👤 YOUR ROLE</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 20px' }}>
                    {ROLES.map(role => (
                        <RadioChip
                            key={role}
                            label={role}
                            selected={user.role === role}
                            onClick={() => setUser(prev => ({ ...prev, role }))}
                        />
                    ))}
                </div>

                {/* Industry */}
                <SectionLabel>🏢 YOUR INDUSTRY</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 20px' }}>
                    {INDUSTRIES.map(ind => (
                        <Chip
                            key={ind}
                            label={ind}
                            selected={user.industry === ind}
                            onClick={() => setUser(prev => ({ ...prev, industry: ind }))}
                        />
                    ))}
                </div>

                {/* Goals */}
                <SectionLabel>🎯 YOUR GOALS (pick up to 3)</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 20px' }}>
                    {GOALS.map(goal => (
                        <Chip
                            key={goal}
                            label={goal}
                            selected={user.goals.includes(goal)}
                            onClick={() => {
                                if (user.goals.includes(goal) || user.goals.length < 3) {
                                    toggleArrayItem('goals', goal);
                                }
                            }}
                        />
                    ))}
                </div>

                {/* AI Level */}
                <SectionLabel>📊 YOUR AI LEVEL</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 20px' }}>
                    {AI_LEVELS.map(lvl => (
                        <Chip
                            key={lvl}
                            label={lvl}
                            selected={user.aiLevel === lvl}
                            onClick={() => setUser(prev => ({ ...prev, aiLevel: lvl }))}
                        />
                    ))}
                </div>

                {/* Learning Style */}
                <SectionLabel>📖 HOW YOU LEARN BEST</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 20px' }}>
                    {LEARNING_STYLES.map(style => (
                        <Chip
                            key={style}
                            label={style}
                            selected={user.learningStyle === style}
                            onClick={() => setUser(prev => ({ ...prev, learningStyle: style }))}
                        />
                    ))}
                </div>

                {/* Preferred Categories */}
                <SectionLabel>📚 CONTENT YOU WANT TO SEE</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 20px' }}>
                    {CONTENT_CATEGORIES.map(cat => (
                        <Chip
                            key={cat}
                            label={cat}
                            emoji={CATEGORY_EMOJIS[cat]}
                            selected={user.preferredCategories.includes(cat)}
                            onClick={() => toggleArrayItem('preferredCategories', cat)}
                        />
                    ))}
                </div>

                {/* Tools Already Known */}
                <SectionLabel>🛠️ TOOLS YOU ALREADY KNOW</SectionLabel>
                <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    color: 'var(--text-3)',
                    padding: '0 20px',
                    margin: '0 0 8px',
                }}>
                    We won't recommend basics for tools you already use.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 20px' }}>
                    {toolNames.map(name => (
                        <Chip
                            key={name}
                            label={name}
                            selected={user.toolsKnown.includes(name)}
                            onClick={() => toggleArrayItem('toolsKnown', name)}
                        />
                    ))}
                </div>
            </div>

            {/* Save Button — fixed at bottom */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '16px 20px',
                background: 'linear-gradient(transparent, var(--bg) 30%)',
                paddingTop: 40,
            }}>
                <button
                    onClick={handleSave}
                    style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: 16,
                        border: 'none',
                        background: saved
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                            : 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)',
                        color: 'white',
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        letterSpacing: '0.02em',
                    }}
                >
                    {saved ? '✓ Saved!' : 'Save Preferences'}
                </button>
            </div>
        </div>
    );
}
