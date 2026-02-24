import React from 'react';
import { storageService, getLevelForXP } from '../../entities/user/storageService';

export function StreakBar() {
    const user = storageService.getUser();
    const lvl = getLevelForXP(user.xp);
    const progress = lvl.nextXp > 0 ? (user.xp / lvl.nextXp) * 100 : 100;

    return (
        <div style={{
            margin: '0 20px',
            background: 'var(--surface-2)',
            borderRadius: 20,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
        }}>
            <span style={{ fontSize: 22 }}>🔥</span>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 18,
                        fontWeight: 800,
                        color: 'var(--orange)',
                    }}>{user.streak}</span>
                    <span style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--text-2)',
                    }}>day streak</span>
                </div>
                <div style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11,
                    color: 'var(--text-3)',
                    marginTop: 2,
                    marginBottom: 6,
                }}>
                    {user.xp} / {lvl.nextXp} XP · {lvl.title} Level
                </div>
                <div style={{
                    height: 4,
                    width: '100%',
                    background: 'var(--surface-3)',
                    borderRadius: 100,
                    overflow: 'hidden',
                }}>
                    <div style={{
                        height: '100%',
                        width: `${Math.min(progress, 100)}%`,
                        background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
                        borderRadius: 100,
                        transition: 'width 0.6s ease',
                    }} />
                </div>
            </div>
            <div style={{
                background: 'var(--accent-bg)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 10,
                padding: '4px 10px',
            }}>
                <span style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--accent-2)',
                }}>Lv. {user.level}</span>
            </div>
        </div>
    );
}
