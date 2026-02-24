import React from 'react';

interface FomoScoreProps {
    score: number;
}

export function FomoScore({ score }: FomoScoreProps) {
    const getBg = () => {
        if (score >= 8) return 'var(--red)';
        if (score >= 5) return 'var(--orange)';
        return 'var(--blue)';
    };

    return (
        <div style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: getBg(),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
        }}>
            <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                fontWeight: 700,
                color: '#fff',
            }}>
                {score}
            </span>
        </div>
    );
}
