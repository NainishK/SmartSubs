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
    const [country, setCountry] = useState('IN'); // Default to India
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);

        // Step 1: Create User
        try {
            await api.post('/users/', { email, password, country });
        } catch (err: any) {
            setLoading(false);
            if (err.response?.status === 400) {
                // Expected business error (duplicate), don't spam console.error
                console.warn('Signup duplicate prevented:', email);
                setError('Email already registered. Please sign in.');
            } else {
                console.error('Signup creation error:', err);
                setError('Failed to create account. Please try again.');
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
            router.push('/dashboard');
        } catch (loginErr) {
            console.error('Auto-login failed:', loginErr);
            // User created but login failed. Redirect to login page with message.
            router.push('/login?registered=true');
        } finally {
            // Note: If successful router.push happens, this might run on unmounted component 
            // but harmless. If redirected, loading state doesn't matter.
            // If failed, we turned off loading in Step 1 catch. 
            // If Step 2 failed, we redirect, so no need to setLoading(false).
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

                    <div className={styles.inputGroup}>
                        <select
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className={styles.input}
                        >
                            <option value="IN">India (IN)</option>
                            <option value="US">United States (US)</option>
                        </select>
                    </div>

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
