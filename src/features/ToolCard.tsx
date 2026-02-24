import React, { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { storageService } from '../entities/user/storageService';
import { LogoContainer } from '../shared/ui/LogoContainer';

import { ToolPricing } from '../shared/types/types';

interface ToolCardTool {
    id: string;
    name: string;
    domain: string;
    category: string;
    tag: string;
    matchScore: number;
    logoUrl?: string;
    pricing?: ToolPricing;
}

interface ToolCardProps {
    tool: ToolCardTool;
    onClick?: () => void;
}

const categoryGradients: Record<string, string> = {
    'Writing': 'linear-gradient(90deg, var(--accent) 0%, var(--accent-2) 100%)',
    'General': 'linear-gradient(90deg, var(--accent) 0%, var(--accent-2) 100%)',
    'Images': 'linear-gradient(90deg, var(--red) 0%, #c084fc 100%)',
    'Coding': 'linear-gradient(90deg, var(--yellow) 0%, var(--orange) 100%)',
    'Audio': 'linear-gradient(90deg, var(--red) 0%, var(--orange) 100%)',
    'Research': 'linear-gradient(90deg, var(--blue) 0%, var(--accent) 100%)',
};

export function ToolCard({ tool, onClick }: ToolCardProps) {
    const [saved, setSaved] = useState(() => storageService.isToolSaved(tool.id));
    return (
        <div
            onClick={onClick}
            style={{
                width: 140,
                flexShrink: 0,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                padding: '14px 12px',
                position: 'relative',
                borderTop: 'none',
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
            {/* Colour bar top */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: categoryGradients[tool.category] || categoryGradients['General'],
                borderRadius: '20px 20px 0 0',
            }} />

            {/* Match badge */}
            <div style={{
                position: 'absolute',
                top: 10,
                right: 10,
                display: 'flex',
                gap: 6,
                alignItems: 'center',
            }}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setSaved(storageService.toggleToolSave(tool.id));
                    }}
                    style={{
                        background: 'rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(4px)',
                        border: 'none',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                    }}
                >
                    <Bookmark size={12} fill={saved ? 'var(--yellow)' : 'none'} color={saved ? 'var(--yellow)' : '#fff'} />
                </button>
                <div style={{
                    background: 'var(--green-bg)',
                    borderRadius: 20,
                    padding: '2px 6px',
                }}>
                    <span style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--green)',
                    }}>{tool.matchScore}%</span>
                </div>
            </div>

            {/* Logo */}
            <LogoContainer
                domain={tool.domain}
                name={tool.name}
                size={36}
                category={tool.category}
                logoUrl={tool.logoUrl}
            />

            {/* Name */}
            <div style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text-1)',
                marginTop: 10,
                marginBottom: 4,
            }}>
                {tool.name}
            </div>

            {/* Tag + Pricing */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 10,
                    color: 'var(--text-3)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1,
                }}>
                    {tool.tag}
                </div>
                {tool.pricing && (
                    <div style={{
                        padding: '1px 4px',
                        borderRadius: 4,
                        background: tool.pricing.model === 'free' ? 'rgba(52,211,153,0.1)' : tool.pricing.model === 'paid' ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)',
                        color: tool.pricing.model === 'free' ? 'var(--green)' : tool.pricing.model === 'paid' ? 'var(--red)' : 'var(--yellow)',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 8,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        marginLeft: 4,
                    }}>
                        {tool.pricing.model}
                    </div>
                )}
            </div>
        </div>
    );
}
