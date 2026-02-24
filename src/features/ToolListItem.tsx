import React from 'react';
import { LogoContainer } from '../shared/ui/LogoContainer';

import { ToolPricing } from '../shared/types/types';

interface ToolListTool {
    id: string;
    name: string;
    domain: string;
    description: string;
    category: string;
    matchScore: number;
    mastery: number;
    isNew?: boolean;
    logoUrl?: string;
    pricing?: ToolPricing;
}

interface ToolListItemProps {
    tool: ToolListTool;
    onClick?: () => void;
}

export function ToolListItem({ tool, onClick }: ToolListItemProps) {
    return (
        <div
            onClick={onClick}
            style={{
                padding: '14px 16px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                display: 'flex',
                gap: 14,
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.99)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
            {/* Logo */}
            <LogoContainer
                domain={tool.domain}
                name={tool.name}
                size={44}
                category={tool.category}
                logoUrl={tool.logoUrl}
            />

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <div style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--text-1)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}>
                        {tool.name}
                    </div>
                    {tool.pricing && (
                        <div style={{
                            padding: '2px 6px',
                            borderRadius: 6,
                            background: tool.pricing.model === 'free' ? 'rgba(52,211,153,0.1)' : tool.pricing.model === 'paid' ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)',
                            border: `1px solid ${tool.pricing.model === 'free' ? 'rgba(52,211,153,0.2)' : tool.pricing.model === 'paid' ? 'rgba(248,113,113,0.2)' : 'rgba(251,191,36,0.2)'}`,
                            color: tool.pricing.model === 'free' ? 'var(--green)' : tool.pricing.model === 'paid' ? 'var(--red)' : 'var(--yellow)',
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 9,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                        }}>
                            {tool.pricing.model}
                        </div>
                    )}
                </div>
                <div style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11,
                    color: 'var(--text-3)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}>
                    {tool.description}
                </div>
                {tool.pricing?.startingPrice && (
                    <div style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 10,
                        color: 'var(--text-3)',
                        marginTop: 4,
                    }}>
                        {tool.pricing.model === 'freemium' ? 'Free + ' : 'From '}{tool.pricing.startingPrice}
                    </div>
                )}
            </div>

            {/* Right column */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 6,
                flexShrink: 0,
            }}>
                {tool.isNew ? (
                    <span style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--blue)',
                        background: 'var(--blue-bg)',
                        borderRadius: 10,
                        padding: '1px 8px',
                    }}>New</span>
                ) : (
                    <span style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--green)',
                    }}>{tool.matchScore}% match</span>
                )}
                <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3].map((dot) => (
                        <div key={dot} style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: dot <= tool.mastery ? 'var(--accent-2)' : 'var(--surface-3)',
                        }} />
                    ))}
                </div>
            </div>
        </div>
    );
}
