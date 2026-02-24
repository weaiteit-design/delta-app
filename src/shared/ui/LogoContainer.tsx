import React, { useState } from 'react';

interface LogoContainerProps {
    domain: string;
    name: string;
    size: 26 | 36 | 44;
    category?: string;
    logoUrl?: string;
    style?: React.CSSProperties;
}

const CATEGORY_TINTS: Record<string, string> = {
    'Writing': 'rgba(99,102,241,0.18)',
    'General': 'rgba(99,102,241,0.15)',
    'Coding': 'rgba(251,146,60,0.18)',
    'Research': 'rgba(96,165,250,0.18)',
    'Images': 'rgba(248,113,113,0.15)',
    'Audio': 'rgba(52,211,153,0.15)',
};

export function LogoContainer({ domain, name, size, category, logoUrl, style }: LogoContainerProps) {
    const [imgError, setImgError] = useState(false);
    const borderRadius = size >= 44 ? 12 : size >= 36 ? 10 : 8;
    const initials = name.slice(0, 2).toUpperCase();
    const tint = CATEGORY_TINTS[category || ''] || 'rgba(99,102,241,0.12)';

    // Priority: logoUrl prop > Google Favicon > initials fallback
    const imgSrc = logoUrl
        ? logoUrl
        : `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

    return (
        <div style={{
            width: size,
            height: size,
            borderRadius,
            background: tint,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
            ...style,
        }}>
            {!imgError ? (
                <img
                    src={imgSrc}
                    alt={name}
                    width={Math.round(size * 0.65)}
                    height={Math.round(size * 0.65)}
                    onError={() => setImgError(true)}
                    style={{
                        objectFit: 'contain',
                        borderRadius: Math.round(borderRadius * 0.6),
                    }}
                />
            ) : (
                <span style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700,
                    fontSize: Math.round(size * 0.32),
                    color: 'var(--text-3)',
                }}>
                    {initials}
                </span>
            )}
        </div>
    );
}
