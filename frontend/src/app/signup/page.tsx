'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Loader2 } from 'lucide-react';
import styles from '../login/login.module.css'; // Reuse login styles

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showLongWait, setShowLongWait] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setShowLongWait(false);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);
        // Cold Start Feedback
        const waitTimer = setTimeout(() => setShowLongWait(true), 2000);

        // Step 1: Create User
        try {
            await api.post('/users/', { email, password });
        } catch (err: any) {
            setLoading(false);
            clearTimeout(waitTimer);
            setShowLongWait(false);

            if (err.response?.status === 400) {
                // Expected business error (duplicate), don't spam console.error
                console.warn('Signup duplicate prevented:', email);
                setError('Email already registered. Please sign in.');
            } else {
                console.error('Signup creation error:', err);
                setError('Failed to create account. Server might be unreachable.');
            }
            return; // Stop here if creation failed
        }

        // Step 2: Auto Login
        try {
            const params = new URLSearchParams();
            params.append('username', email);
            params.append('password', password);

            const response = await api.post('/token', params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            localStorage.setItem('token', response.data.access_token);
            // Clear timer before redirect (cleanliness)
            clearTimeout(waitTimer);
            // Redirect to welcome screen for region selection (same as OAuth flow)
            router.push('/welcome');
        } catch (loginErr) {
            console.error('Auto-login failed:', loginErr);
            // User created but login failed. Redirect to login page with message.
            clearTimeout(waitTimer);
            router.push('/login?registered=true');
        } finally {
            // In success cases, we redirect, but cleanup is good practice
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.glassCard}>
                <div className={styles.brandHeader}>
                    <span className={styles.logoIcon}>💎</span>
                    <h1 className={styles.title}>Join Us</h1>
                    <p className={styles.subtitle}>Start managing your subscriptions</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <button
                        type="button"
                        className={styles.googleButton}
                        onClick={() => window.location.href = `${api.defaults.baseURL}/auth/login/google`}
                    >
                        <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.734 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                            </g>
                        </svg>
                        Sign up with Google
                    </button>
                    <div className={styles.divider}>or with email</div>

                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.inputGroup}>
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <input
                            type="password"
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className={styles.input}
                        />
                    </div>


                    {showLongWait && loading && (
                        <div style={{
                            marginBottom: '1rem',
                            padding: '0.75rem',
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '8px',
                            color: '#93c5fd',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Loader2 className="animate-spin" size={16} />
                            <span>Waking up server... (This usually takes ~50s for the first request)</span>
                        </div>
                    )}

                    <button type="submit" className={styles.button} disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} style={{ marginRight: 8, display: 'inline' }} />
                                Creating Account...
                            </>
                        ) : 'Create Account'}
                    </button>

                    <div className={styles.registerLink}>
                        Already have an account?
                        <Link href="/login">Sign In</Link>
                    </div>
                </form>
            </div >
        </div >
    );
}
