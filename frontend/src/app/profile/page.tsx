'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import styles from './profile.module.css';
import {
    ArrowLeft, CheckCircle, AlertCircle, Bug, Save,
    User, Settings, Users, Clock, Globe, Monitor, Ban
} from 'lucide-react';
import ConfirmationModal from '@/components/ConfirmationModal';
import ReportIssueModal from '@/components/ReportIssueModal';
import CustomSelect from '@/components/CustomSelect';
import { useRecommendations } from '@/context/RecommendationsContext';
import { COUNTRY_CURRENCY_MAP } from '@/lib/currency';

interface UserData {
    id: number;
    email: string;
    country: string;
    google_id?: string | null;
    preferences?: string | null;
}

interface UserPreferences {
    target_budget?: number;
    target_currency?: string;
    watch_time_weekly?: number;
    household_size?: string;
    languages?: string[];
    viewing_style?: string;
    devices?: string[];
    deal_breakers?: string[];
    [key: string]: any;
}

const LANG_OPTIONS   = ['English', 'Spanish', 'French', 'German', 'Japanese', 'Korean', 'Hindi', 'Mandarin', 'Italian'];
const DEVICE_OPTIONS = ['Mobile/Tablet', 'Laptop', 'TV (1080p)', '4K Home Theater'];
const STYLE_OPTIONS  = ['Casual', 'Binge Watcher', 'Weekly Releases', 'Cinematic Focus'];

type Tab = 'account' | 'preferences';

export default function Profile() {
    const [activeTab, setActiveTab] = useState<Tab>('account');
    const [user, setUser] = useState<UserData | null>(null);
    const [country, setCountry] = useState('IN');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);
    const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    const [preferences, setPreferences] = useState<UserPreferences>({
        household_size: 'Solo',
        devices: [],
        deal_breakers: [],
        languages: [],
    });
    const [savingPrefs, setSavingPrefs] = useState(false);
    const [prefsMessage, setPrefsMessage] = useState('');

    let refreshRecommendations: ((force?: boolean) => Promise<void>) | undefined;
    try {
        const ctx = useRecommendations();
        refreshRecommendations = ctx.refreshRecommendations;
    } catch (_) {}

    useEffect(() => { fetchProfile(); }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/users/me/');
            setUser(res.data);
            setCountry(res.data.country || 'IN');
            if (res.data.preferences) {
                try {
                    const parsed = JSON.parse(res.data.preferences);
                    if (!parsed.target_currency && res.data.country) {
                        parsed.target_currency = COUNTRY_CURRENCY_MAP[res.data.country] || 'USD';
                    }
                    setPreferences(prev => ({ ...prev, ...parsed }));
                } catch (_) {}
            }
        } catch (err) {
            console.error('Failed to fetch profile', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        try {
            await api.put('/users/profile', { country });
            setMessage('Settings saved!');
            setTimeout(() => setMessage(''), 3000);
            if (user) setUser({ ...user, country });
            refreshRecommendations?.(true).catch(() => {});
        } catch (_) {
            setMessage('Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    const handleSavePreferences = async () => {
        setSavingPrefs(true);
        setPrefsMessage('');
        try {
            await api.put('/users/me/preferences', preferences);
            setPrefsMessage('Preferences saved!');
            setTimeout(() => setPrefsMessage(''), 3000);
        } catch (_) {
            setPrefsMessage('Failed to save preferences.');
        } finally {
            setSavingPrefs(false);
        }
    };

    const handleTogglePill = (field: keyof UserPreferences, value: string) => {
        const current = (preferences[field] as string[]) || [];
        setPreferences({
            ...preferences,
            [field]: current.includes(value) ? current.filter(i => i !== value) : [...current, value]
        });
    };

    const handleDisconnectClick = () => setIsDisconnectModalOpen(true);
    const confirmDisconnect = async () => {
        setIsDisconnectModalOpen(false);
        try {
            await api.post('/auth/disconnect/google');
            setMessage('Google account disconnected.');
            if (user) setUser({ ...user, google_id: null });
        } catch (err: any) {
            setMessage('Failed: ' + (err.response?.data?.detail || 'Could not disconnect.'));
        }
    };

    const currencySymbol = preferences.target_currency === 'INR' ? '₹' : '$';

    if (loading) return (
        <div className={styles.container}>
            <div className={styles.glassCard} style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                Loading profile...
            </div>
        </div>
    );

    return (
        <div className={styles.container}>
            <div className={styles.glassCard}>

                {/* ── Header ── */}
                <header className={styles.header}>
                    <h1 className={styles.title}>Profile</h1>
                    <Link href="/dashboard" className={styles.backLink}>
                        <ArrowLeft size={15} /> Dashboard
                    </Link>
                </header>

                {/* ── Tab Nav ── */}
                <div className={styles.tabNav}>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'account' ? styles.tabBtnActive : ''}`}
                        onClick={() => setActiveTab('account')}
                    >
                        <User size={15} /> Account
                    </button>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'preferences' ? styles.tabBtnActive : ''}`}
                        onClick={() => setActiveTab('preferences')}
                    >
                        <Settings size={15} /> Preferences
                    </button>
                </div>

                {/* ── Tab Body ── */}
                <div className={styles.tabBody}>

                    {/* ════ ACCOUNT TAB ════ */}
                    {activeTab === 'account' && (
                        <form onSubmit={handleSave}>
                            {/* Account Info */}
                            <div className={styles.section}>
                                <div className={styles.sectionTitle}>Account</div>

                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>Email</span>
                                    <span className={styles.infoValue}>{user?.email}</span>
                                </div>

                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>Google Account</span>
                                    {user?.google_id ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <span className={styles.googleConnected}>
                                                <CheckCircle size={13} strokeWidth={3} /> Connected
                                            </span>
                                            <button type="button" onClick={handleDisconnectClick} className={styles.disconnectBtn}>
                                                Disconnect
                                            </button>
                                        </div>
                                    ) : (
                                        <a href={`${api.defaults.baseURL}/auth/login/google`} className={styles.googleBtn}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                            </svg>
                                            Connect Google
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Region */}
                            <div className={styles.section}>
                                <div className={styles.sectionTitle}>Region</div>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="country" className={styles.label}>Country / Region</label>
                                    <CustomSelect
                                        value={country}
                                        options={[
                                            { value: 'US', label: '🇺🇸 United States (US)' },
                                            { value: 'IN', label: '🇮🇳 India (IN)' }
                                        ]}
                                        onChange={(val) => setCountry(val as string)}
                                        className={styles.select}
                                    />
                                    <p className={styles.helperText}>Affects subscription costs and content availability.</p>
                                </div>
                            </div>

                            <button type="submit" className={styles.saveButton} disabled={saving}>
                                <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                            </button>

                            {message && (
                                <div className={`${styles.message} ${message.includes('Failed') ? styles.messageError : styles.messageSuccess}`}>
                                    {message.includes('Failed') ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                                    {message}
                                </div>
                            )}

                            <button type="button" className={styles.reportBtn} onClick={() => setIsReportModalOpen(true)}>
                                <Bug size={16} /> Report an Issue
                            </button>
                        </form>
                    )}

                    {/* ════ PREFERENCES TAB ════ */}
                    {activeTab === 'preferences' && (
                        <div>
                            <div className={styles.section}>
                                <div className={styles.sectionTitle}>These improve AI recommendations and are used across the app</div>

                                {/* Household + Style */}
                                <div className={styles.twoCol}>
                                    <div className={styles.inputGroup} style={{ marginBottom: 0 }}>
                                        <label className={styles.label}><Users size={13} />Household</label>
                                        <CustomSelect
                                            value={preferences.household_size || 'Solo'}
                                            options={[
                                                { value: 'Solo', label: 'Just Me' },
                                                { value: 'Couple', label: 'Couple' },
                                                { value: 'Family', label: 'Family / Shared' }
                                            ]}
                                            onChange={(val) => setPreferences({ ...preferences, household_size: val as string })}
                                            className={styles.select}
                                        />
                                    </div>
                                    <div className={styles.inputGroup} style={{ marginBottom: 0 }}>
                                        <label className={styles.label}><Clock size={13} />Viewing Style</label>
                                        <CustomSelect
                                            value={preferences.viewing_style || 'Casual'}
                                            options={STYLE_OPTIONS.map(opt => ({ value: opt, label: opt }))}
                                            onChange={(val) => setPreferences({ ...preferences, viewing_style: val as string })}
                                            className={styles.select}
                                        />
                                    </div>
                                </div>

                                {/* Budget */}
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Monthly Budget ({currencySymbol})</label>
                                    <input
                                        type="number"
                                        className={styles.select}
                                        placeholder="e.g. 50"
                                        value={preferences.target_budget || ''}
                                        onChange={e => setPreferences({ ...preferences, target_budget: parseInt(e.target.value) || undefined })}
                                    />
                                    <p className={styles.helperText}>Used to flag when your total spend exceeds your target.</p>
                                </div>

                                {/* Languages */}
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}><Globe size={13} />Preferred Languages</label>
                                    <div className={styles.pillRow}>
                                        {LANG_OPTIONS.map(lang => (
                                            <button
                                                key={lang}
                                                type="button"
                                                className={`${styles.pill} ${preferences.languages?.includes(lang) ? styles.pillActive : ''}`}
                                                onClick={() => handleTogglePill('languages', lang)}
                                            >{lang}</button>
                                        ))}
                                    </div>
                                </div>

                                {/* Devices */}
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}><Monitor size={13} />Primary Devices</label>
                                    <div className={styles.pillRow}>
                                        {DEVICE_OPTIONS.map(dev => (
                                            <button
                                                key={dev}
                                                type="button"
                                                className={`${styles.pill} ${preferences.devices?.includes(dev) ? styles.pillActive : ''}`}
                                                onClick={() => handleTogglePill('devices', dev)}
                                            >{dev}</button>
                                        ))}
                                    </div>
                                </div>

                                {/* Deal Breakers */}
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}><Ban size={13} />Deal Breakers</label>
                                    <input
                                        type="text"
                                        className={styles.select}
                                        placeholder="e.g. Horror, Reality TV, Anime"
                                        value={preferences.deal_breakers?.join(', ') || ''}
                                        onChange={e => setPreferences({ ...preferences, deal_breakers: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                    />
                                    <p className={styles.helperText}>Genres or content types you never want recommended.</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                className={styles.saveButton}
                                onClick={handleSavePreferences}
                                disabled={savingPrefs}
                            >
                                <Save size={16} /> {savingPrefs ? 'Saving...' : 'Save Preferences'}
                            </button>

                            {prefsMessage && (
                                <div className={`${styles.message} ${prefsMessage.includes('Failed') ? styles.messageError : styles.messageSuccess}`}>
                                    {prefsMessage.includes('Failed') ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                                    {prefsMessage}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={isDisconnectModalOpen}
                onClose={() => setIsDisconnectModalOpen(false)}
                onConfirm={confirmDisconnect}
                title="Disconnect Google Account"
                message="Are you sure you want to disconnect your Google account? You'll need your password to log in next time."
                confirmLabel="Disconnect"
                isDangerous={true}
            />

            <ReportIssueModal
                visible={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
            />
        </div>
    );
}
