'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import styles from '../login.module.css'; // Reuse login styles

export default function AuthCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState('Completing secure sign-in...');

    useEffect(() => {
        // 1. Get Token from URL
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const error = params.get('error');

        if (token) {
            // 2. Store Token
            localStorage.setItem('token', token);
            setStatus('Redirecting to dashboard...');

            // 3. Redirect (Short delay for UX)
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 800);
        } else if (error) {
            setStatus('Authentication failed. Redirecting to login...');
            setTimeout(() => router.push('/login'), 2000);
        } else {
            // Fallback
            setStatus('Invalid request.');
            setTimeout(() => router.push('/login'), 2000);
        }
    }, [router]);

    return (
        <div className={styles.container}>
            <div className={styles.glassCard} style={{ textAlign: 'center', minHeight: '300px', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" size={48} color="#6366f1" style={{ margin: '0 auto' }} />
                <h2 className={styles.title} style={{ marginTop: '1.5rem', fontSize: '1.5rem' }}>One moment...</h2>
                <p className={styles.subtitle}>{status}</p>
            </div>
        </div>
    );
}
