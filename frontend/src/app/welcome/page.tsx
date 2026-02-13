'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './welcome.module.css';
import CustomSelect from '@/components/CustomSelect';
import api from '@/lib/api';

export default function WelcomePage() {
    const router = useRouter();
    const [country, setCountry] = useState('US');
    const [isLoading, setIsLoading] = useState(false);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        // Ensure user is authenticated, otherwise redirect to login
        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
            router.push('/login');
        } else {
            setToken(storedToken);
        }
    }, [router]);

    const handleContinue = async () => {
        setIsLoading(true);
        try {
            await api.put('/users/profile', { country }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Redirect to dashboard after successful update
            router.push('/dashboard');
        } catch (error) {
            console.error('Failed to update profile:', error);
            // Even if it fails, maybe redirect? Or show error.
            // For onboarding, let's keep it simple: retry or proceed.
            // If it's a critical error (like auth), API interceptor usually handles it.
            // Let's assume we want them to retry.
            alert('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) return null; // Or a spinner

    return (
        <div className={styles.container}>
            <div className={styles.glassCard}>
                <div>
                    <h1 className={styles.title}>Welcome! 🎉</h1>
                    <p className={styles.subtitle}>
                        Thanks for joining SmartSubs. <br />
                        Please confirm your region to get personalized pricing.
                    </p>
                </div>

                <div className={styles.form}>
                    <CustomSelect
                        value={country}
                        options={[
                            { value: 'US', label: '🇺🇸 United States (US)' },
                            { value: 'IN', label: '🇮🇳 India (IN)' },
                            { value: 'GB', label: '🇬🇧 United Kingdom (GB)' },
                            { value: 'CA', label: '🇨🇦 Canada (CA)' },
                            { value: 'AU', label: '🇦🇺 Australia (AU)' }
                        ]}
                        onChange={(val) => setCountry(val as string)}
                        forceLightMode={true}
                    />

                    <button
                        className={styles.saveButton}
                        onClick={handleContinue}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Saving...' : 'Continue to Dashboard'}
                    </button>
                </div>
            </div>
        </div>
    );
}
