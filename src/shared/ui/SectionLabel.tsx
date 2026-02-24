import React from 'react';

interface SectionLabelProps {
    children: React.ReactNode;
}

export function SectionLabel({ children }: SectionLabelProps) {
    return (
        <div style={{
            padding: '0 20px',
            marginBottom: 10,
        }}>
            <span style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                color: 'var(--text-3)',
            }}>
                {children}
            </span>
        </div>
    );
}
