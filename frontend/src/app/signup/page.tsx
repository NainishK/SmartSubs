'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import styles from '../login/login.module.css'; // Reuse login styles

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await api.post('/users/', { email, password });
            // Auto login after signup
            const formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);
            const response = await api.post('/token', formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            localStorage.setItem('token', response.data.access_token);
            router.push('/dashboard');
        } catch (err) {
            setError('Signup failed. Email may be taken.');
        }
    };

    return (
        <div className={styles.container}>
            <form onSubmit={handleSubmit} className={styles.form}>
                <h1>Sign Up</h1>
                {error && <p className={styles.error}>{error}</p>}
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={styles.input}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={styles.input}
                />
                <button type="submit" className={styles.button}>Create Account</button>
            </form>
        </div>
    );
}
