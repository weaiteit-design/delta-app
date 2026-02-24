import React from 'react';
import { storageService, getLevelForXP, LEVELS } from '../entities/user/storageService';
import { SectionLabel } from '../shared/ui/SectionLabel';
import { X, Pencil, Share2 } from 'lucide-react';

interface ProfileScreenProps {
    onClose: () => void;
    onOpenPreferences?: () => void;
}

const SKILLS = [
    { name: 'AI Writing', emoji: '✍️', percent: 72, color: 'var(--accent-2)' },
    { name: 'Prompt Engineering', emoji: '🧠', percent: 58, color: 'var(--blue)' },
    { name: 'AI Image Gen', emoji: '🎨', percent: 28, color: 'var(--pink)' },
    { name: 'Coding Copilots', emoji: '💻', percent: 45, color: 'var(--orange)' },
    { name: 'AI Research', emoji: '🔬', percent: 62, color: 'var(--green)' },
];

export function ProfileScreen({ onClose, onOpenPreferences }: ProfileScreenProps) {
    const user = storageService.getUser();
    const currentLevelIdx = LEVELS.findIndex(l => l.title === user.levelTitle);
    const nextLevel = LEVELS[currentLevelIdx + 1];

    return (
        <div className="screen-container" style={{ background: 'var(--bg)' }}>
            {/* Status bar */}
            <div style={{ height: 44 }} />

            {/* Top bar */}
            <div style={{
                padding: '8px 20px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <h1 style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 20,
                    fontWeight: 800,
                    color: 'var(--text-1)',
                    margin: 0,
                }}>Profile</h1>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={onOpenPreferences} style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                    }}>
                        <Pencil size={14} color="var(--text-3)" />
                    </button>
                    <button onClick={onClose} style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                    }}>
                        <X size={14} color="var(--text-3)" />
                    </button>
                </div>
            </div>

            {/* Profile Hero */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '10px 20px 24px',
            }}>
                <div style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 30px rgba(99,102,241,0.2)',
                    marginBottom: 12,
                }}>
                    <span style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 24,
                        fontWeight: 700,
                        color: '#fff',
                    }}>{user.initials}</span>
                </div>
                <h2 style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'var(--text-1)',
                    margin: 0,
                }}>{user.name}</h2>
                <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    color: 'var(--text-3)',
                    marginTop: 4,
                }}>{user.role}</p>
                <div style={{
                    marginTop: 8,
                    background: 'var(--accent-bg)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: 9999,
                    padding: '4px 14px',
                }}>
                    <span style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--accent-2)',
                    }}>
                        {user.levelTitle} · Level {user.level}
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 12,
                padding: '0 20px',
                marginBottom: 28,
            }}>
                {[
                    { value: user.streak, label: 'Day Streak', emoji: '🔥', color: 'var(--orange)' },
                    { value: user.xp, label: 'XP Earned', emoji: '⚡', color: 'var(--accent-2)' },
                    { value: user.lessonsCompleted, label: 'Lessons Done', emoji: '📖', color: 'var(--green)' },
                ].map((stat) => (
                    <div key={stat.label} style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 20,
                        padding: '14px 12px',
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: 16, marginBottom: 4 }}>{stat.emoji}</div>
                        <div style={{
                            fontFamily: "'Syne', sans-serif",
                            fontSize: 22,
                            fontWeight: 800,
                            color: stat.color,
                        }}>{stat.value}</div>
                        <div style={{
                            fontFamily: "'Syne', sans-serif",
                            fontSize: 10,
                            fontWeight: 700,
                            color: 'var(--text-3)',
                            textTransform: 'uppercase' as const,
                            letterSpacing: '0.06em',
                            marginTop: 2,
                        }}>{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Share Button */}
            <div style={{ padding: '0 20px', marginBottom: 28 }}>
                <button style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--accent-2)',
                }}>
                    <Share2 size={16} />
                    Share to LinkedIn
                </button>
            </div>

            {/* Edit Preferences */}
            <div style={{ padding: '0 20px', marginBottom: 28 }}>
                <button onClick={onOpenPreferences} style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.06) 100%)',
                    border: '1px solid rgba(99,102,241,0.25)',
                    borderRadius: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>⚙️</span>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 14,
                                fontWeight: 600,
                                color: 'var(--text-1)',
                            }}>Edit Feed Preferences</div>
                            <div style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 11,
                                color: 'var(--text-3)',
                            }}>Role · Industry · Goals · Categories</div>
                        </div>
                    </div>
                    <span style={{ color: 'var(--text-3)', fontSize: 16 }}>→</span>
                </button>
            </div>

            {/* AI Skill Stack */}
            <SectionLabel>🎯 YOUR AI SKILL STACK</SectionLabel>
            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
                {SKILLS.map((skill) => (
                    <div key={skill.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 16 }}>{skill.emoji}</span>
                                <span style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: 'var(--text-1)',
                                }}>{skill.name}</span>
                            </div>
                            <span style={{
                                fontFamily: "'DM Mono', monospace",
                                fontSize: 12,
                                color: 'var(--text-3)',
                            }}>{skill.percent}%</span>
                        </div>
                        <div style={{
                            height: 6,
                            width: '100%',
                            background: 'var(--surface-3)',
                            borderRadius: 100,
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${skill.percent}%`,
                                background: skill.color,
                                borderRadius: 100,
                                transition: 'width 0.8s ease',
                            }} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Level Journey */}
            <SectionLabel>🏆 LEVEL JOURNEY</SectionLabel>
            <div style={{ padding: '0 20px', marginBottom: 28 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                    {LEVELS.map((lv, i) => (
                        <div key={lv.title} style={{
                            flex: 1,
                            height: 8,
                            borderRadius: 100,
                            background: i <= currentLevelIdx
                                ? 'linear-gradient(90deg, var(--accent), var(--accent-2))'
                                : 'var(--surface-3)',
                            transition: 'background 0.3s ease',
                        }} />
                    ))}
                </div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                }}>
                    {LEVELS.map((lv, i) => (
                        <span key={lv.title} style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 8,
                            color: i <= currentLevelIdx ? 'var(--accent-2)' : 'var(--text-3)',
                            textAlign: 'center',
                            flex: 1,
                        }}>{lv.title}</span>
                    ))}
                </div>
                {nextLevel && (
                    <p style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 12,
                        color: 'var(--text-3)',
                        textAlign: 'center',
                        marginTop: 8,
                    }}>
                        {nextLevel.xp - user.xp} XP to reach {nextLevel.title}
                    </p>
                )}
            </div>

            <div style={{ height: 20 }} />
        </div>
    );
}
