'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import styles from './settings.module.css';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

export default function Settings() {
    const [country, setCountry] = useState('US');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await api.get('/users/me/');
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
            await api.put(`/users/me?country=${country}`);
            setMessage('Settings saved successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Failed to update profile', error);
            setMessage('Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className={styles.container}>
            <div className={styles.glassCard} style={{ alignItems: 'center', justifyContent: 'center', height: '300px' }}>
                <p className={styles.helperText}>Loading settings...</p>
            </div>
        </div>
    );

    return (
        <div className={styles.container}>
            <div className={styles.glassCard}>
                <header className={styles.header}>
                    <h1 className={styles.title}>Settings</h1>
                    <Link href="/dashboard" className={styles.backLink}>
                        <ArrowLeft size={16} /> Back to Dashboard
                    </Link>
                </header>

                <form onSubmit={handleSave} className={styles.formSection}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="country" className={styles.label}>Country / Region</label>
                        <div style={{ position: 'relative' }}>
                            <select
                                id="country"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                className={styles.select}
                            >
                                <option value="US">🇺🇸 United States (US)</option>
                                <option value="IN">🇮🇳 India (IN)</option>
                                <option value="GB">🇬🇧 United Kingdom (GB)</option>
                                <option value="CA">🇨🇦 Canada (CA)</option>
                                <option value="AU">🇦🇺 Australia (AU)</option>
                            </select>
                        </div>
                        <p className={styles.helperText}>
                            This affects subscription costs and content availability.
                        </p>
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
        </div>
    );
}
