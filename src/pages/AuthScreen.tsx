import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase, IS_CONFIGURED } from '../shared/api/supabaseClient';
import { colors, radius } from '../shared/platform/theme';

export function AuthScreen({ onLogin }: { onLogin: () => void }) {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        setError('');
        if (!IS_CONFIGURED) {
            onLogin();
            return;
        }
        setLoading(true);
        try {
            if (isSignUp) {
                const { error: signUpError } = await supabase.auth.signUp({ email, password });
                if (signUpError) throw signUpError;
                const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
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
                const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
                if (signInError) throw signInError;
                onLogin();
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred during authentication.');
        } finally {
            setLoading(false);
        }
    };

    const isDisabled = loading || !email || !password;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Logo / Title */}
            <View style={styles.header}>
                <View style={styles.logoBox}>
                    <Text style={styles.logoText}>△</Text>
                </View>
                <Text style={styles.title}>Welcome to Delta</Text>
                <Text style={styles.subtitle}>Your personalized AI intelligence feed.</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
                <View style={styles.fieldWrapper}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="you@example.com"
                        placeholderTextColor={colors.text3}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>
                <View style={styles.fieldWrapper}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••••••"
                        placeholderTextColor={colors.text3}
                        secureTextEntry
                        autoCapitalize="none"
                        returnKeyType="go"
                        onSubmitEditing={handleSubmit}
                    />
                </View>

                {!!error && (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isDisabled}
                    style={[styles.submitBtn, isDisabled && styles.submitBtnDisabled]}
                >
                    <Text style={styles.submitBtnText}>
                        {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Toggle sign-in / sign-up */}
            <View style={styles.toggleRow}>
                <TouchableOpacity onPress={() => { setIsSignUp(!isSignUp); setError(''); }}>
                    <Text style={styles.toggleText}>
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </Text>
                </TouchableOpacity>
            </View>

            {!IS_CONFIGURED && (
                <View style={styles.localModeNotice}>
                    <Text style={styles.localModeText}>
                        Running in local-only mode (No Supabase keys).{'\n'}Sign in will bypass authentication.
                    </Text>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        backgroundColor: colors.bg,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoBox: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    logoText: {
        fontSize: 28,
        color: '#fff',
        fontWeight: '700',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text1,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: colors.text3,
    },
    form: {
        gap: 16,
    },
    fieldWrapper: {
        marginBottom: 4,
    },
    label: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.text2,
        marginBottom: 8,
    },
    input: {
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingVertical: 14,
        paddingHorizontal: 16,
        fontSize: 15,
        color: colors.text1,
    },
    errorBox: {
        padding: 12,
        backgroundColor: 'rgba(248,113,113,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(248,113,113,0.2)',
        borderRadius: radius.sm,
    },
    errorText: {
        fontSize: 13,
        color: colors.red,
        textAlign: 'center',
    },
    submitBtn: {
        paddingVertical: 16,
        backgroundColor: colors.text1,
        borderRadius: radius.md,
        alignItems: 'center',
        marginTop: 8,
    },
    submitBtnDisabled: {
        opacity: 0.7,
    },
    submitBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.bg,
    },
    toggleRow: {
        alignItems: 'center',
        marginTop: 24,
    },
    toggleText: {
        fontSize: 14,
        color: colors.text3,
    },
    localModeNotice: {
        alignItems: 'center',
        marginTop: 40,
    },
    localModeText: {
        fontSize: 12,
        color: colors.yellow,
        textAlign: 'center',
        lineHeight: 18,
    },
});
