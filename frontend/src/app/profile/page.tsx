'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import styles from './profile.module.css';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import ConfirmationModal from '@/components/ConfirmationModal';
import CustomSelect from '@/components/CustomSelect';
import { useRecommendations } from '@/context/RecommendationsContext';

interface User {
    id: number;
    email: string;
    country: string;
    google_id?: string | null;
}

export default function Profile() {
    const [user, setUser] = useState<User | null>(null);
    const [country, setCountry] = useState('US');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);
    const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
    const router = useRouter();
    // Safely get context (might be undefined if outside provider, but we expect it to be inside dashboard if linked)
    let refreshRecommendations: ((force?: boolean) => Promise<void>) | undefined;
    try {
        const context = useRecommendations();
        refreshRecommendations = context.refreshRecommendations;
    } catch (e) {
        // Ignore if outside provider
    }

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await api.get('/users/me/');
            setUser(response.data);
            setCountry(response.data.country || 'US');
        } catch (error) {
            console.error('Failed to fetch profile', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        try {
            await api.put(`/users/profile`, { country: country });
            setMessage('Settings saved successfully!');
            setTimeout(() => setMessage(''), 3000);

            if (user) {
                setUser({ ...user, country });
            }

            // Force refresh recommendations context if available
            if (refreshRecommendations) {
                // Run in background
                refreshRecommendations(true).catch(e => console.error("Failed to refresh recs", e));
            }
        } catch (error) {
            console.error('Failed to update profile', error);
            setMessage('Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    const handleDisconnectClick = () => {
        setIsDisconnectModalOpen(true);
    };

    const confirmDisconnect = async () => {
        setIsDisconnectModalOpen(false);
        try {
            await api.post('/auth/disconnect/google');
            setMessage('Google account disconnected.');
            if (user) setUser({ ...user, google_id: null });
        } catch (error: any) {
            console.error('Failed to disconnect', error);
            const msg = error.response?.data?.detail || 'Failed to disconnect Google account.';
            setMessage('Failed: ' + msg);
        }
    };

    if (loading) return (
        <div className={styles.container}>
            <div className={styles.glassCard} style={{ alignItems: 'center', justifyContent: 'center', height: '300px' }}>
                <p className={styles.helperText}>Loading profile...</p>
            </div>
        </div>
    );

    return (
        <div className={styles.container}>
            <div className={styles.glassCard}>
                <header className={styles.header}>
                    <h1 className={styles.title}>Profile</h1>
                    <Link href="/dashboard" className={styles.backLink}>
                        <ArrowLeft size={16} /> Back to Dashboard
                    </Link>
                </header>

                <form onSubmit={handleSave}>
                    {/* Account Settings */}
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Account Settings</h2>

                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Email</span>
                            <span className={styles.infoValue}>{user?.email}</span>
                        </div>

                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Google Account</span>
                            {user?.google_id ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span className={styles.googleConnected}>
                                        <CheckCircle size={14} strokeWidth={3} /> Connected
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleDisconnectClick}
                                        className={styles.disconnectBtn}
                                        title="Disconnect Google Account"
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            ) : (
                                <a href={`${api.defaults.baseURL}/auth/login/google`} className={styles.googleBtn}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    Connect
                                </a>
                            )}
                        </div>
                    </div>

                    {/* General Settings */}
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>General Settings</h2>

                        <div className={styles.inputGroup}>
                            <label htmlFor="country" className={styles.label}>Country / Region</label>
                            <div style={{ position: 'relative' }}>
                                <CustomSelect
                                    value={country}
                                    options={[
                                        { value: 'US', label: '🇺🇸 United States (US)' },
                                        { value: 'IN', label: '🇮🇳 India (IN)' }
                                    ]}
                                    onChange={(val) => setCountry(val as string)}
                                    className={styles.select}
                                />
                            </div>
                            <p className={styles.helperText}>
                                This affects subscription costs and content availability.
                            </p>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className={styles.saveButton}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>

                    {message && (
                        <div className={`${styles.message} ${message.includes('Failed') ? styles.messageError : styles.messageSuccess}`}>
                            {message.includes('Failed') ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                            {message}
                        </div>
                    )}
                </form>
            </div>

            <ConfirmationModal
                isOpen={isDisconnectModalOpen}
                onClose={() => setIsDisconnectModalOpen(false)}
                onConfirm={confirmDisconnect}
                title="Disconnect Google Account"
                message="Are you sure you want to disconnect your Google account? You will need to use your password to login next time."
                confirmLabel="Disconnect"
                isDangerous={true}
            />
        </div>
    );
}
