import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallbackMessage?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    padding: '40px 20px',
                    textAlign: 'center',
                }}>
                    <span style={{ fontSize: 48, marginBottom: 16 }}>⚠️</span>
                    <h2 style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 18,
                        fontWeight: 700,
                        color: 'var(--text-1)',
                        margin: '0 0 8px',
                    }}>Something went wrong</h2>
                    <p style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        color: 'var(--text-3)',
                        lineHeight: 1.5,
                        maxWidth: 300,
                        margin: '0 0 20px',
                    }}>
                        {this.props.fallbackMessage || 'This section encountered an error. Try refreshing the app.'}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        style={{
                            padding: '10px 24px',
                            borderRadius: 12,
                            border: '1px solid var(--border)',
                            background: 'var(--surface-2)',
                            color: 'var(--text-1)',
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
