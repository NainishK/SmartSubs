import React, { useState, useEffect, useRef } from 'react';
import styles from './AIInsightsModal.module.css';
import { Sparkles, X, Settings, TrendingUp, DollarSign, Check, XCircle, Film, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../lib/api';
import { AIUnifiedResponse, UserPreferences, AIRecommendation } from '../lib/types';
import MediaCard from './MediaCard';
import ConfirmationModal from './ConfirmationModal';
import { COUNTRY_CURRENCY_MAP, COUNTRY_SYMBOL_MAP } from '../lib/currency';

interface AIInsightsModalProps {
    isOpen: boolean;
    onClose: () => void;
    watchlist?: Array<{ id: number; tmdb_id: number; status: string; user_rating?: number }>;
    onWatchlistUpdate?: () => void;
}

const AIInsightsModal: React.FC<AIInsightsModalProps> = ({ isOpen, onClose, watchlist = [], onWatchlistUpdate }) => {
    const [activeTab, setActiveTab] = useState<'picks' | 'strategy' | 'preferences'>('picks');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<AIUnifiedResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);

    // Preferences Form State
    const [preferences, setPreferences] = useState<UserPreferences>({
        target_budget: undefined,
        watch_time_weekly: undefined,
        household_size: 'Solo',
        devices: [],
        deal_breakers: []
    });
    const [savingPref, setSavingPref] = useState(false);

    // Access Control State
    const [aiAllowed, setAiAllowed] = useState(false);
    const [accessStatus, setAccessStatus] = useState<string>('none');
    const [requestingAccess, setRequestingAccess] = useState(false);

    // Usage State for First-Time Logic
    const [lastAiUsage, setLastAiUsage] = useState<string | null>(null);
    const [hasData, setHasData] = useState(false);

    const autoLoadRef = useRef(false);

    // Initial Load & Auto-Generate Logic
    useEffect(() => {
        if (isOpen) {
            fetchPreferences();
            // Reset auto-load state on open
            autoLoadRef.current = false;
        }
    }, [isOpen]);

    useEffect(() => {
        // Only auto-generate if they have used it before (smart cache load)
        // AND if we haven't tried auto-loading yet in this session
        if (isOpen && aiAllowed && lastAiUsage && !autoLoadRef.current && hasData) {
            autoLoadRef.current = true;
            handleGenerate(false);
        }
    }, [isOpen, aiAllowed, lastAiUsage, hasData]);

    const [userCountry, setUserCountry] = useState<string>('US'); // Default US

    // ... imports at top should include getCurrencySymbol from currency.ts but let's just map locally for speed or import properly?
    // Let's assume we can add the import.

    const fetchPreferences = async () => {
        try {
            const res = await api.get('/users/me/');
            if (res.data.country) {
                setUserCountry(res.data.country);
            }
            if (res.data.preferences) {
                const prefs = JSON.parse(res.data.preferences);
                // Auto-set currency if missing
                if (!prefs.target_currency && res.data.country) {
                    prefs.target_currency = COUNTRY_CURRENCY_MAP[res.data.country] || 'USD';
                }
                setPreferences(prefs);
            }
            // Logic to set aiAllowed and status
            setAiAllowed(!!res.data.ai_allowed);
            setAccessStatus(res.data.ai_access_status || 'none');
            setLastAiUsage(res.data.last_ai_usage);

            // Check if user has data (subscriptions OR watchlist)
            const subCount = res.data.subscriptions ? res.data.subscriptions.length : 0;
            const watchCount = watchlist.length; // Use prop or res.data.watchlist
            setHasData(subCount > 0 || watchCount > 0);

            if (res.data.preferences) {
                // Initialize currency even if no prefs yet
                setPreferences(prev => ({
                    ...prev,
                    target_currency: COUNTRY_CURRENCY_MAP[res.data.country] || 'USD'
                }));
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Derived Currency Info
    const currencySymbol = COUNTRY_SYMBOL_MAP[userCountry] || '$';
    const currencyCode = COUNTRY_CURRENCY_MAP[userCountry] || 'USD';

    const handleSavePreferences = async () => {
        setSavingPref(true);
        try {
            // Clean up empty strings/arrays if needed
            const toSend = { ...preferences };
            await api.put('/users/me/preferences', toSend);
            // Show success modal
            setShowSaveConfirm(true);
        } catch (e) {
            console.error(e);
            alert("Failed to save preferences.");
        } finally {
            setSavingPref(false);
        }
    };

    const handleGenerate = async (force = false) => {
        setLoading(true);
        setError(null);
        try {
            const url = force ? '/recommendations/insights?force_refresh=true' : '/recommendations/insights';
            const res = await api.post(url);
            if (res.data && (res.data.picks || res.data.strategy)) {
                setData(res.data);
                // Update local usage state if success
                setLastAiUsage(new Date().toISOString());
                if (activeTab === 'preferences') setActiveTab('picks');
            } else {
                setError("AI returned incomplete data. Please try again.");
            }
        } catch (e: any) {
            console.error(e);
            let msg = "Failed to generate insights. AI might be busy.";

            // Extract Axios error message
            if (e.response && e.response.data && e.response.data.detail) {
                msg = e.response.data.detail;
            } else if (e.message === "Network Error") {
                msg = "Network Error: Please check if the backend is running.";
            }

            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const LANG_OPTIONS = ["English", "Spanish", "French", "German", "Japanese", "Korean", "Hindi", "Mandarin", "Italian"];
    const DEVICE_OPTIONS = ["Mobile/Tablet", "Laptop", "TV (1080p)", "4K Home Theater"];
    const STYLE_OPTIONS = ["Casual", "Binge Watcher", "Weekly Releases", "Cinematic Focus"];

    const handleTogglePill = (field: keyof UserPreferences, value: string) => {
        const current = preferences[field] as string[] || [];
        const newArray = current.includes(value)
            ? current.filter(i => i !== value)
            : [...current, value];
        setPreferences({ ...preferences, [field]: newArray });
    };

    const handleRequestAccess = async () => {
        setRequestingAccess(true);
        try {
            const res = await api.post('/users/me/access/ai');
            if (res.data.status === 'requested') {
                setAccessStatus('requested');
            } else if (res.data.status === 'approved') {
                setAiAllowed(true);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to request access.");
        } finally {
            setRequestingAccess(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className={styles.overlay} onClick={onClose}>
                <div className={styles.modal} onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className={styles.header}>
                        <div className={styles.titleWrapper}>
                            <Sparkles size={24} color="#7c3aed" />
                            <h2 className={styles.title}>AI Intelligence Center</h2>
                            <span className={styles.betaBadge}>BETA</span>
                        </div>
                        <button className={styles.closeButton} onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Tabs */}
                    {aiAllowed && (
                        <div className={styles.tabsContainer}>
                            <button
                                className={`${styles.tabBtn} ${activeTab === 'picks' ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab('picks')}
                            >
                                <Film size={18} /> Curator Picks
                            </button>
                            <button
                                className={`${styles.tabBtn} ${activeTab === 'strategy' ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab('strategy')}
                            >
                                <TrendingUp size={18} /> Smart Strategy
                            </button>
                            <button
                                className={`${styles.tabBtn} ${activeTab === 'preferences' ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab('preferences')}
                                style={{ marginLeft: 'auto' }}
                            >
                                <Settings size={18} /> My Profile
                                {(!preferences.target_budget || !preferences.household_size) && (
                                    <span className={styles.notificationDot} />
                                )}
                            </button>
                            <button
                                className={`${styles.tabBtn}`}
                                onClick={() => hasData && handleGenerate(true)}
                                disabled={!hasData}
                                title="Refresh Intelligence"
                                style={{ marginLeft: '12px', color: '#7c3aed', background: '#f3f4f6', border: 'none', opacity: hasData ? 1 : 0.5 }}
                            >
                                <RefreshCw size={18} />
                            </button>
                        </div>
                    )}

                    {/* Content */}
                    <div className={styles.content}>
                        {/* QUOTA EXCEEDED ERROR SCREEN */}
                        {data && data.warning === 'AI_QUOTA_EXCEEDED' ? (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '4rem 2rem',
                                textAlign: 'center',
                                height: '100%'
                            }}>
                                <div style={{
                                    background: '#fee2e2',
                                    padding: '1.5rem',
                                    borderRadius: '50%',
                                    marginBottom: '1.5rem'
                                }}>
                                    <AlertTriangle size={48} color="#dc2626" />
                                </div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
                                    AI Service Temporarily Unavailable
                                </h2>
                                <p style={{ color: '#6b7280', maxWidth: '400px', marginBottom: '2rem', lineHeight: '1.6' }}>
                                    Our AI engine is currently experiencing high demand. Please try again later or check back tomorrow for fresh insights.
                                </p>
                                <button
                                    className={styles.saveBtn}
                                    onClick={onClose}
                                    style={{ background: '#e5e7eb', color: '#374151', width: 'auto', padding: '0.75rem 1.5rem' }}
                                >
                                    Close
                                </button>
                            </div>
                        ) : (
                            <>
                                {error && (
                                    <div style={{
                                        background: '#fee2e2',
                                        border: '1px solid #ef4444',
                                        color: '#b91c1c',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        marginBottom: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <AlertTriangle size={20} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {data && data.warning && (
                                    <div style={{
                                        background: '#fffbeb',
                                        border: '1px solid #f59e0b',
                                        color: '#b45309',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        marginBottom: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <AlertTriangle size={20} />
                                        <span>{data.warning}</span>
                                    </div>
                                )}

                                {!aiAllowed ? (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '4rem 2rem',
                                        textAlign: 'center',
                                        height: '100%'
                                    }}>
                                        <div style={{
                                            background: '#f3f4f6',
                                            padding: '1.5rem',
                                            borderRadius: '50%',
                                            marginBottom: '1.5rem'
                                        }}>
                                            <Sparkles size={48} color="#7c3aed" />
                                        </div>
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
                                            {accessStatus === 'requested' ? 'Access Requested' : 'Private Beta Access'}
                                        </h2>
                                        <p style={{ color: '#6b7280', maxWidth: '400px', marginBottom: '2rem', lineHeight: '1.6' }}>
                                            {accessStatus === 'requested'
                                                ? "You've been added to the waitlist. We'll notify you when your profile is ready for analysis."
                                                : "The AI Intelligence Center is currently in private beta. Request access to unlock personalized recommendations and spending strategy."}
                                        </p>

                                        {accessStatus === 'requested' ? (
                                            <button disabled className={styles.saveBtn} style={{ background: '#e5e7eb', color: '#6b7280', cursor: 'default' }}>
                                                <Check size={18} style={{ marginRight: '8px' }} /> Request Pending
                                            </button>
                                        ) : (
                                            <button
                                                className={styles.saveBtn}
                                                onClick={handleRequestAccess}
                                                disabled={requestingAccess}
                                                style={{ background: '#7c3aed', border: 'none', color: 'white' }}
                                            >
                                                {requestingAccess ? 'Processing...' : 'Request Access'}
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        {activeTab === 'picks' && (
                                            <>
                                                {!data && !loading && (
                                                    <div className={styles.loadingWrapper}>
                                                        <Sparkles size={48} color={hasData ? "#ddd" : "#e5e7eb"} />

                                                        {!hasData ? (
                                                            // Empty State
                                                            <>
                                                                <h3 style={{ margin: '1rem 0 0.5rem 0', color: '#374151' }}>Build Your Profile</h3>
                                                                <p style={{ maxWidth: 300 }}>
                                                                    The AI needs data to work with. Please add active subscriptions or add movies/shows to your watchlist first.
                                                                </p>

                                                            </>
                                                        ) : (
                                                            // Ready State
                                                            <>
                                                                <p>Ready to analyze your library. Click below to start.</p>
                                                                <button className={styles.saveBtn} style={{ maxWidth: 200 }} onClick={() => handleGenerate(false)}>
                                                                    Generate Insights
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}

                                                {loading && (
                                                    <div className={styles.loadingWrapper}>
                                                        <RefreshCw className="animate-spin" size={48} color="#7c3aed" />
                                                        <p>Analyzing 28,000+ titles and your watchlist...</p>
                                                    </div>
                                                )}

                                                {data && !loading && (
                                                    <>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                                                            <h3 className={styles.sectionTitle}>Tap to Watch (On your services)</h3>
                                                        </div>

                                                        {data.picks.length === 0 ? (
                                                            <div style={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                padding: '3rem',
                                                                background: 'white',
                                                                borderRadius: '12px',
                                                                border: '1px solid #e5e7eb',
                                                                color: '#6b7280',
                                                                textAlign: 'center'
                                                            }}>
                                                                <Film size={48} color="#e5e7eb" style={{ marginBottom: '1rem' }} />
                                                                <h4 style={{ margin: '0 0 0.5rem 0', color: '#111827', fontSize: '1.1rem' }}>No perfect matches found</h4>
                                                                <p style={{ margin: 0, maxWidth: '300px' }}>
                                                                    Your preferences might be too strict. Try adding more languages or services to your profile.
                                                                </p>
                                                                <button
                                                                    className={styles.saveBtn}
                                                                    style={{ marginTop: '1.5rem', width: 'auto' }}
                                                                    onClick={() => setActiveTab('preferences')}
                                                                >
                                                                    Adjust Profile
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className={styles.grid}>
                                                                {data.picks.map((rec, idx) => {
                                                                    const tmdbId = rec.tmdb_id || 0;
                                                                    const existingItem = watchlist.find(w => w.tmdb_id === tmdbId || (w.tmdb_id === 0 && rec.title === 'Title needed'));

                                                                    return (
                                                                        <div key={idx} style={{ position: 'relative' }}>
                                                                            <MediaCard
                                                                                item={{
                                                                                    id: tmdbId,
                                                                                    dbId: existingItem?.id,
                                                                                    title: rec.title,
                                                                                    overview: rec.overview || '',
                                                                                    poster_path: rec.poster_path || '',
                                                                                    vote_average: rec.vote_average || 0,
                                                                                    media_type: rec.media_type || 'movie',
                                                                                    status: existingItem?.status,
                                                                                    user_rating: existingItem?.user_rating || 0
                                                                                }}
                                                                                showServiceBadge={rec.service}
                                                                                customBadgeColor="#7c3aed"
                                                                                aiReason={rec.reason}
                                                                                existingStatus={existingItem?.status}
                                                                                onAddSuccess={onWatchlistUpdate}
                                                                                onStatusChange={() => onWatchlistUpdate?.()}
                                                                            />
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </>
                                        )}

                                        {activeTab === 'strategy' && (
                                            <>
                                                {!data && !loading && (
                                                    <div className={styles.loadingWrapper}>
                                                        <Sparkles size={48} color={hasData ? "#ddd" : "#e5e7eb"} />
                                                        {!hasData ? (
                                                            <>
                                                                <h3 style={{ margin: '1rem 0 0.5rem 0', color: '#374151' }}>Build Your Profile</h3>
                                                                <p style={{ maxWidth: 300 }}>
                                                                    The AI needs data to work with. Please add active subscriptions or add movies/shows to your watchlist first.
                                                                </p>

                                                            </>
                                                        ) : (
                                                            <>
                                                                <p>Generate insights to see financial strategy.</p>
                                                                <button className={styles.saveBtn} style={{ maxWidth: 200 }} onClick={() => handleGenerate(false)}>
                                                                    Generate
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                                {data && (
                                                    <>
                                                        <div className={styles.strategyList}>
                                                            {data.strategy.map((item, idx) => (
                                                                <div key={idx} className={styles.strategyCard}>
                                                                    <div className={`${styles.strategyIcon} ${item.action === 'Add' ? styles.iconAdd : styles.iconCancel}`}>
                                                                        {item.action === 'Add' ? <Check size={24} /> : <XCircle size={24} />}
                                                                    </div>
                                                                    <div className={styles.strategyContent}>
                                                                        <h4 className={styles.strategyTitle}>{item.action} {item.service}</h4>
                                                                        <p className={styles.strategyReason}>{item.reason}</p>
                                                                        {item.savings && item.action === 'Cancel' && (
                                                                            <span className={styles.savingsTag} style={{ color: '#166534', background: '#dcfce7', borderColor: '#86efac' }}>
                                                                                Save {currencySymbol}{item.savings}/mo
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {data.strategy.length === 0 && (
                                                                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                                                    <Check size={48} style={{ display: 'block', margin: '0 auto 1rem auto', color: '#10b981' }} />
                                                                    <p>Your subscription portfolio looks optimized! No changes recommended.</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {data.gaps.length > 0 && (
                                                            <div className={styles.gapsSection}>
                                                                <h3 className={styles.sectionTitle}>
                                                                    <AlertTriangle size={20} color="#f59e0b" />
                                                                    Missing Out Checklist
                                                                </h3>
                                                                <div className={styles.grid}>
                                                                    {data.gaps.map((gap, idx) => {
                                                                        const tmdbId = gap.tmdb_id || 0;
                                                                        const existingItem = watchlist.find(w => w.tmdb_id === tmdbId);

                                                                        return (
                                                                            <div key={idx} style={{ position: 'relative' }}>
                                                                                <MediaCard
                                                                                    item={{
                                                                                        id: tmdbId,
                                                                                        dbId: existingItem?.id,
                                                                                        title: gap.title,
                                                                                        overview: gap.overview || '',
                                                                                        poster_path: gap.poster_path || '',
                                                                                        vote_average: 0,
                                                                                        media_type: gap.media_type || 'movie',
                                                                                        status: existingItem?.status,
                                                                                        user_rating: existingItem?.user_rating || 0
                                                                                    }}
                                                                                    aiReason={gap.reason}
                                                                                    showServiceBadge={gap.service} // Expected service
                                                                                    customBadgeColor="#f59e0b" // Amber for missing
                                                                                    existingStatus={existingItem?.status}
                                                                                    onAddSuccess={onWatchlistUpdate}
                                                                                />
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </>
                                        )}

                                        {activeTab === 'preferences' && (
                                            <div className={styles.formSection}>
                                                <h3 className={styles.sectionTitle} style={{ marginBottom: '1.5rem' }}>Enhance AI Accuracy</h3>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                                    <div className={styles.formGroup}>
                                                        <label className={styles.label}>Household</label>
                                                        <select
                                                            className={styles.select}
                                                            value={preferences.household_size || 'Solo'}
                                                            onChange={(e) => setPreferences({ ...preferences, household_size: e.target.value })}
                                                        >
                                                            <option value="Solo">Just Me</option>
                                                            <option value="Couple">Couple</option>
                                                            <option value="Family">Family / Shared</option>
                                                        </select>
                                                    </div>
                                                    <div className={styles.formGroup}>
                                                        <label className={styles.label}>Viewing Style</label>
                                                        <select
                                                            className={styles.select}
                                                            value={preferences.viewing_style || 'Casual'}
                                                            onChange={(e) => setPreferences({ ...preferences, viewing_style: e.target.value })}
                                                        >
                                                            {STYLE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Target Monthly Budget ({currencySymbol})</label>
                                                    <input
                                                        type="number"
                                                        className={styles.input}
                                                        placeholder={`e.g. 50`}
                                                        value={preferences.target_budget || ''}
                                                        onChange={(e) => setPreferences({ ...preferences, target_budget: parseInt(e.target.value) || undefined })}
                                                    />
                                                    <p className={styles.helperText}>Calculations will respect your region's currency ({currencyCode}).</p>
                                                </div>

                                                {/* Languages */}
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Preferred Languages</label>
                                                    <div className={styles.pillContainer}>
                                                        {LANG_OPTIONS.map(lang => (
                                                            <button
                                                                key={lang}
                                                                className={`${styles.pill} ${preferences.languages?.includes(lang) ? styles.pillActive : ''}`}
                                                                onClick={() => handleTogglePill('languages', lang)}
                                                            >
                                                                {lang}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Devices */}
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Primary Devices</label>
                                                    <div className={styles.pillContainer}>
                                                        {DEVICE_OPTIONS.map(dev => (
                                                            <button
                                                                key={dev}
                                                                className={`${styles.pill} ${preferences.devices?.includes(dev) ? styles.pillActive : ''}`}
                                                                onClick={() => handleTogglePill('devices', dev)}
                                                            >
                                                                {dev}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>Deal Breakers (Comma separated)</label>
                                                    <input
                                                        type="text"
                                                        className={styles.input}
                                                        placeholder="e.g. Horror, Reality TV, Anime"
                                                        value={preferences.deal_breakers?.join(', ') || ''}
                                                        onChange={(e) => setPreferences({ ...preferences, deal_breakers: e.target.value.split(',').map(s => s.trim()) })}
                                                    />
                                                </div>

                                                <button className={styles.saveBtn} onClick={handleSavePreferences} disabled={savingPref}>
                                                    {savingPref ? 'Saving...' : 'Save Preferences'}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}

                            </>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showSaveConfirm}
                onClose={() => setShowSaveConfirm(false)}
                onConfirm={() => {
                    setShowSaveConfirm(false);
                    setActiveTab('picks');
                }}
                title="Preferences Saved"
                message="Your AI profile has been updated. The analyst will now use these settings to generate more accurate recommendations."
                confirmLabel="Awesome"
                isDangerous={false}
            />
        </>
    );
};

export default AIInsightsModal;
