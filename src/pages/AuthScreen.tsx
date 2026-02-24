import React, { useState } from 'react';
import { supabase, IS_CONFIGURED } from '../shared/api/supabaseClient';

export function AuthScreen({ onLogin }: { onLogin: () => void }) {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!IS_CONFIGURED) {
            // Bypass auth if no Supabase credentials
            onLogin();
            return;
        }

        setLoading(true);

        try {
            if (isSignUp) {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (signUpError) throw signUpError;
                // Auto login or show success message depending on email confirmation settings
                const { error: loginError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (loginError) {
                    if (loginError.message.includes('Email not confirmed')) {
                        setError('Please check your email to confirm your account.');
                    } else {
                        throw loginError;
                    }
                } else {
                    onLogin();
                }
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;
                onLogin();
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred during authentication.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 24px',
            background: 'var(--bg)',
        }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <div style={{
                    width: 64,
                    height: 64,
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                    borderRadius: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                </div>
                <h1 style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 28,
                    fontWeight: 700,
                    color: 'var(--text-1)',
                    marginBottom: 8,
                }}>
                    Welcome to Delta
                </h1>
                <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 16,
                    color: 'var(--text-3)',
                }}>
                    Your personalized AI intelligence feed.
                </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                    <label style={{ display: 'block', marginBottom: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>
                        Email
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        style={{
                            width: '100%',
                            padding: '14px 16px',
                            background: 'var(--surface-2)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            color: 'var(--text-1)',
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 15,
                            outline: 'none',
                        }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>
                        Password
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        style={{
                            width: '100%',
                            padding: '14px 16px',
                            background: 'var(--surface-2)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            color: 'var(--text-1)',
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 15,
                            outline: 'none',
                        }}
                    />
                </div>

                {error && (
                    <div style={{
                        padding: 12,
                        background: 'rgba(248, 113, 113, 0.1)',
                        border: '1px solid rgba(248, 113, 113, 0.2)',
                        borderRadius: 8,
                        color: 'var(--red)',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        textAlign: 'center',
                    }}>
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || !email || !password}
                    style={{
                        padding: '16px',
                        background: 'var(--text-1)',
                        color: 'var(--bg)',
                        border: 'none',
                        borderRadius: 12,
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 16,
                        fontWeight: 700,
                        cursor: (loading || !email || !password) ? 'not-allowed' : 'pointer',
                        opacity: (loading || !email || !password) ? 0.7 : 1,
                        marginTop: 8,
                        transition: 'opacity 0.2s',
                    }}
                >
                    {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
                </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 24 }}>
                <button
                    onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-3)',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 14,
                        cursor: 'pointer',
                    }}
                >
                    {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
            </div>

            {!IS_CONFIGURED && (
                <div style={{ textAlign: 'center', marginTop: 40 }}>
                    <p style={{ color: 'var(--yellow)', fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
                        Running in local-only mode (No Supabase keys).<br />
                        Sign in will bypass authentication.
                    </p>
                </div>
            )}
        </div>
    );
}
