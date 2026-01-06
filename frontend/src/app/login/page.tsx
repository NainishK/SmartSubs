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
                        <a
                            href="#"
                            className={styles.forgotPassword}
                            onClick={(e) => {
                                e.preventDefault();
                                alert("Password recovery is currently disabled in this demo environment. Please contact support if you are locked out.");
                            }}
                        >
                            Forgot Password?
                        </a>
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
    );
}
