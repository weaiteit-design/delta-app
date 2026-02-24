import React, { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { FomoScore } from '../shared/ui/FomoScore';
import { storageService } from '../entities/user/storageService';

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
        case 'capability': return 'var(--red)';
        case 'trick': return 'var(--orange)';
        case 'workflow': return 'var(--blue)';
        case 'new-tool': return 'var(--green)';
        case 'tool-update': return 'var(--accent-2)';
        default: return 'var(--text-3)';
    }
}

export function NewsCard({ item, onClick }: NewsCardProps) {
    const [saved, setSaved] = useState(() => storageService.isArticleSaved(item.id));
    const dotColor = getNewsColor(item.type);

    return (
        <div
            onClick={onClick || (() => item.url && window.open(item.url, '_blank'))}
            style={{
                padding: '14px 16px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                display: 'flex',
                gap: 14,
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.99)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
            {/* Type dot */}
            <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: dotColor,
                marginTop: 5,
                flexShrink: 0,
            }} />

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase' as const,
                    color: dotColor,
                }}>
                    {item.tag}
                </span>
                <div style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--text-1)',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const,
                    overflow: 'hidden',
                    margin: '4px 0',
                }}>
                    {item.title}
                </div>
                <div style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11,
                    color: 'var(--text-3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                }}>
                    {item.source}
                    <span style={{ color: 'var(--border-2)' }}>·</span>
                    {item.timeAgo}
                </div>
            </div>

            {/* FOMO Score and Bookmark */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setSaved(storageService.toggleArticleSave(item.id));
                    }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                    }}
                >
                    <Bookmark size={18} fill={saved ? 'var(--yellow)' : 'none'} color={saved ? 'var(--yellow)' : 'var(--text-3)'} />
                </button>
                <FomoScore score={item.fomoScore} />
            </div>
        </div>
    );
}
