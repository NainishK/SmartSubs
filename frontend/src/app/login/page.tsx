'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import styles from './login.module.css';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [showLongWait, setShowLongWait] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Check for registration success param
        const params = new URLSearchParams(window.location.search);
        if (params.get('registered') === 'true') {
            setSuccess('Account created successfully! Please sign in.');
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        setShowLongWait(false);

        // Show "Waking up server" message if it takes longer than 2s (Cold Start)
        const waitTimer = setTimeout(() => setShowLongWait(true), 2000);

        try {
            const params = new URLSearchParams();
            params.append('username', email);
            params.append('password', password);

            const response = await api.post('/token', params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            localStorage.setItem('token', response.data.access_token);
            // Optional: Add a small delay for the user to see success state if we added one
            window.location.href = '/dashboard';
        } catch (err: any) {
            if (err.response?.status === 401) {
                console.warn('Login auth failed (Invalid credentials)');
                setError('Invalid email or password');
            } else {
                console.error('Login error:', err);
                setError('Login failed. Server might be sleeping or unreachable.');
            }
        } finally {
            clearTimeout(waitTimer);
            setLoading(false);
            setShowLongWait(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.glassCard}>
                <div className={styles.brandHeader}>
                    <span className={styles.logoIcon}>💎</span>
                    <h1 className={styles.title}>Welcome Back</h1>
                    <p className={styles.subtitle}>Manage your subscriptions smartly</p>
                </div>

                <div className={styles.formContainer}>
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
                        Continue with Google
                    </button>

                    <div className={styles.divider}>or with email</div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {success && <div className={styles.successMessage} style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>{success}</div>}
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
                            <Link href="/forgot-password" className={styles.forgotPassword}>
                                Forgot Password?
                            </Link>
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
                                <span>Waking up server... (This usually takes ~50s for the first login)</span>
                            </div>
                        )}

                        <button type="submit" className={styles.button} disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} style={{ marginRight: 8, display: 'inline' }} />
                                    Signing in...
                                </>
                            ) : 'Sign In'}
                        </button>

                        <div className={styles.registerLink}>
                            Don't have an account?
                            <Link href="/signup">Sign up</Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
