import React from 'react';
import { Home, BookOpen, Zap, Wrench, MessageCircle, Library } from 'lucide-react';

export type TabName = 'home' | 'learn' | 'updates' | 'tools' | 'chat' | 'library';

interface BottomNavProps {
    active: TabName;
    onSelect: (tab: TabName) => void;
}

const tabs: { id: TabName; label: string; Icon: React.FC<any> }[] = [
    { id: 'home', label: 'Home', Icon: Home },
    { id: 'learn', label: 'Learn', Icon: BookOpen },
    { id: 'updates', label: 'Updates', Icon: Zap },
    { id: 'tools', label: 'Tools', Icon: Wrench },
    { id: 'chat', label: 'Chat', Icon: MessageCircle },
    { id: 'library', label: 'Library', Icon: Library }, // Reusing BookOpen or we could use Library from lucide-react
];

export function BottomNav({ active, onSelect }: BottomNavProps) {
    return (
        <nav style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            background: 'rgba(10,10,11,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid var(--border)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            padding: '0 12px 16px',
        }}>
            {tabs.map(({ id, label, Icon }) => {
                const isActive = id === active;
                return (
                    <button
                        key={id}
                        onClick={() => onSelect(id)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 4,
                            padding: '6px 14px',
                            borderRadius: 14,
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            transition: 'color 0.2s ease',
                        }}
                    >
                        <Icon
                            size={22}
                            color={isActive ? 'var(--accent-2)' : 'var(--text-3)'}
                            strokeWidth={2}
                            fill={isActive ? 'var(--accent-2)' : 'none'}
                        />
                        <span style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 10,
                            fontWeight: 500,
                            letterSpacing: '0.02em',
                            color: isActive ? 'var(--accent-2)' : 'var(--text-3)',
                            transition: 'color 0.2s ease',
                        }}>
                            {label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
}
