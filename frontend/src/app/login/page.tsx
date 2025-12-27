'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import styles from './login.module.css';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
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
            console.error('Login error:', err);
            setLoading(false);
            if (err.response?.status === 401) {
                setError('Invalid email or password');
            } else {
                setError('Login failed. Please check if the server is running.');
            }
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

                    <button type="submit" className={styles.button} disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
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
