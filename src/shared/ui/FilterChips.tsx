import React from 'react';

interface FilterChipsProps {
    chips: string[];
    active: string;
    onSelect: (chip: string) => void;
}

export function FilterChips({ chips, active, onSelect }: FilterChipsProps) {
    return (
        <div style={{
            display: 'flex',
            gap: 8,
            padding: '0 20px',
            overflowX: 'auto',
            marginBottom: 14,
            scrollbarWidth: 'none',
        }}>
            {chips.map((chip) => {
                const isActive = chip === active;
                return (
                    <button
                        key={chip}
                        onClick={() => onSelect(chip)}
                        style={{
                            flexShrink: 0,
                            padding: '6px 14px',
                            borderRadius: 20,
                            border: `1px solid ${isActive ? 'rgba(99,102,241,0.4)' : 'var(--border-2)'}`,
                            background: isActive ? 'var(--accent-bg)' : 'var(--surface-2)',
                            color: isActive ? 'var(--accent-2)' : 'var(--text-2)',
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s ease',
                            outline: 'none',
                        }}
                    >
                        {chip}
                    </button>
                );
            })}
        </div>
    );
}
