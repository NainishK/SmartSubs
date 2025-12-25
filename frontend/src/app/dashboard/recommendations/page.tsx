'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import styles from '../dashboard.module.css';
import { Recommendation } from '@/lib/types';
import MediaCard, { MediaItem } from '@/components/MediaCard';
import { useRecommendations } from '@/context/RecommendationsContext';

export default function RecommendationsPage() {
    const {
        dashboardRecs,
        similarRecs,
        loadingDashboard,
        loadingSimilar,
        refreshRecommendations
    } = useRecommendations();

    const [watchlist, setWatchlist] = useState<Array<{ id: number; tmdb_id: number; status: string; user_rating?: number }>>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [aiRecs, setAiRecs] = useState<any[]>([]);
    const [loadingAi, setLoadingAi] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    useEffect(() => {
        fetchWatchlist();
        fetchCachedAiRecs();
    }, []);

    const fetchCachedAiRecs = async () => {
        try {
            const response = await api.get('/recommendations/ai');
            if (response.data && Array.isArray(response.data) && response.data.length > 0) {
                setAiRecs(response.data);
            }
        } catch (error) {
            // calculated silently, no error needed if cache empty
            console.log('No cached AI recs found or error');
        }
    };

    const fetchWatchlist = async () => {
        try {
            const response = await api.get('/watchlist/');
            // Map all necessary fields
            setWatchlist(response.data.map((item: any) => ({
                id: item.id, // Database ID
                tmdb_id: item.tmdb_id,
                status: item.status,
                user_rating: item.user_rating
            })));
        } catch (error) {
            console.error('Failed to fetch watchlist', error);
        }
    };

    const handleGenerateAI = async () => {
        setLoadingAi(true);
        setAiError(null);
        try {
            const response = await api.post('/recommendations/ai');
            if (response.data && Array.isArray(response.data)) {
                setAiRecs(response.data);
            } else {
                setAiError('Failed to generate recommendations.');
            }
        } catch (error) {
            console.error('AI Generation failed', error);
            setAiError('Failed to generate recommendations. Please try again.');
        } finally {
            setLoadingAi(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await refreshRecommendations();
        setRefreshing(false);
    };

    const watchNowRecs = dashboardRecs.filter(r => r.type === 'watch_now');
    const cancelRecs = dashboardRecs.filter(r => r.type === 'cancel');

    if (loadingDashboard && dashboardRecs.length === 0) return <div className={styles.loading}>Loading...</div>;

    return (
        <div className={styles.container}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 className={styles.pageTitle} style={{ marginBottom: 0 }}>Smart Recommendations</h1>
            </div>

            <div className={styles.content}>
                <div className={styles.leftColumn} style={{ width: '100%' }}>
                    <section className={styles.listSection}>
                        {dashboardRecs.length === 0 && !loadingSimilar && similarRecs.length === 0 && (
                            <p style={{ color: '#666', fontStyle: 'italic' }}>No recommendations yet. Add more items to your watchlist!</p>
                        )}

                        {/* Watch Now Section */}
                        {watchNowRecs.length > 0 && (
                            <div className={styles.recGroup}>
                                <h3 className={styles.recGroupTitle} style={{ color: '#2e7d32' }}>
                                    ✅ Watch Now
                                </h3>
                                <div className={styles.recGrid}>
                                    {watchNowRecs.map((rec, index) => (
                                        <div key={index} className={`${styles.recCard} ${styles.recCardGreen}`}>
                                            <div className={styles.recHeader}>
                                                <h4>{rec.service_name}</h4>
                                                <span className={styles.badge}>Included</span>
                                            </div>
                                            <p className={styles.recReason}>{rec.reason}</p>
                                            <div className={styles.recTags}>
                                                {rec.items.map((item, i) => (
                                                    <span key={i} className={styles.tag}>{item}</span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Cancel Section - MOVED UP */}
                        {cancelRecs.length > 0 && (
                            <div className={styles.recGroup} style={{ marginTop: '1.5rem', marginBottom: '2.5rem' }}>
                                <h3 className={styles.recGroupTitle} style={{ color: '#c62828' }}>
                                    ⚠️ Unused Subscriptions
                                </h3>
                                <div className={styles.recGrid}>
                                    {cancelRecs.map((rec, index) => (
                                        <div key={index} className={`${styles.recCard} ${styles.recCardRed}`}>
                                            <div className={styles.recHeader}>
                                                <h4>{rec.service_name}</h4>
                                                <span className={styles.savingsBadge}>Save ${rec.savings}</span>
                                            </div>
                                            <p className={styles.recReason}>{rec.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* AI Curator Section */}
                        <div className={styles.recGroup} style={{ marginTop: '2.5rem', border: '1px solid #e0e0e0', padding: '1.5rem', borderRadius: '12px', background: 'linear-gradient(to right, #f8f9fa, #ffffff)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <h3 className={styles.recGroupTitle} style={{ color: '#6a1b9a', marginBottom: 0 }}>
                                        🤖 AI Curator Picks
                                    </h3>
                                    <span style={{ fontSize: '0.7rem', backgroundColor: '#e1bee7', color: '#4a148c', padding: '2px 6px', borderRadius: '4px' }}>BETA</span>
                                </div>
                                <button
                                    onClick={handleGenerateAI}
                                    disabled={loadingAi}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: loadingAi ? '#9c27b0' : '#8e24aa',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: loadingAi ? 'wait' : 'pointer',
                                        opacity: loadingAi ? 0.7 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        fontWeight: 500,
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    {loadingAi ? 'Creating...' : '✨ Generate AI Picks'}
                                </button>
                            </div>

                            {/* Intro Text */}
                            {aiRecs.length === 0 && !loadingAi && !aiError && (
                                <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                    Want deeper insights? Our AI Curator analyzes your entire watch history and tastes to find
                                    hidden gems available on your subscriptions. Click "Generate" to start.
                                </p>
                            )}

                            {/* Error State */}
                            {aiError && (
                                <div style={{ padding: '1rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '6px', marginBottom: '1rem' }}>
                                    {aiError}
                                </div>
                            )}

                            {/* Loading State */}
                            {loadingAi && (
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#6a1b9a' }}>
                                    <p>Thinking...</p>
                                    <p style={{ fontSize: '0.8rem', color: '#888' }}>Analyzing your history to find perfect matches.</p>
                                </div>
                            )}

                            {/* Results Grid - UNIFIED GRID STYLE */}
                            {aiRecs.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                    {aiRecs.map((rec, index) => {
                                        // map AI response to MediaCard Item (only if we have an ID)
                                        if (!rec.tmdb_id) {
                                            // Fallback for failed enrichment (text only)
                                            return (
                                                <div key={index} className={`${styles.recCard}`} style={{ borderLeft: '4px solid #8e24aa' }}>
                                                    <div className={styles.recHeader} style={{ marginBottom: '0.5rem' }}>
                                                        <h4 style={{ fontSize: '1.1rem', color: '#333' }}>{rec.title}</h4>
                                                        <span className={styles.badge} style={{ backgroundColor: '#f3e5f5', color: '#8e24aa' }}>{rec.service}</span>
                                                    </div>
                                                    <p className={styles.recReason} style={{ fontSize: '0.95rem', fontStyle: 'italic', color: '#555' }}>"{rec.reason}"</p>
                                                </div>
                                            );
                                        }

                                        const existingItem = watchlist.find(w => w.tmdb_id === rec.tmdb_id);

                                        const item: MediaItem = {
                                            id: rec.tmdb_id,
                                            // Pass DB ID if found in watchlist
                                            dbId: existingItem?.id,
                                            title: rec.title,
                                            media_type: rec.media_type || 'movie',
                                            overview: rec.overview || rec.reason,
                                            poster_path: rec.poster_path,
                                            vote_average: rec.vote_average,
                                            user_rating: existingItem?.user_rating // Pass existing rating
                                        };

                                        return (
                                            <div key={index} style={{ display: 'flex', flexDirection: 'column' }}>
                                                <MediaCard
                                                    item={item}
                                                    existingStatus={existingItem?.status}
                                                    onAddSuccess={fetchWatchlist}
                                                    showServiceBadge={rec.service} // Badge inside card handles context
                                                    customBadgeColor="#8e24aa"
                                                    aiReason={rec.reason} // Pass the AI's logic
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>



                        {/* Similar Content Section */}
                        <div className={styles.recGroup} style={{ marginTop: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 className={styles.recGroupTitle} style={{ color: '#1976d2', marginBottom: 0 }}>
                                    🎬 You Might Like
                                </h3>
                                <button
                                    onClick={handleRefresh}
                                    disabled={refreshing || loadingSimilar}
                                    style={{
                                        padding: '0.4rem 0.8rem',
                                        backgroundColor: '#1976d2',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: (refreshing || loadingSimilar) ? 'not-allowed' : 'pointer',
                                        opacity: (refreshing || loadingSimilar) ? 0.7 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    {refreshing ? 'Refreshing...' : '🔄 Refresh'}
                                </button>
                            </div>

                            {loadingSimilar && similarRecs.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                                    Finding personalized recommendations...
                                </div>
                            ) : similarRecs.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                    {similarRecs.map((rec, index) => {
                                        const item: MediaItem = {
                                            id: rec.tmdb_id || 0,
                                            title: rec.items[0],
                                            media_type: rec.media_type || 'movie',
                                            overview: rec.overview || '',
                                            poster_path: rec.poster_path,
                                            vote_average: rec.vote_average
                                        };
                                        const existingItem = watchlist.find(w => w.tmdb_id === item.id);

                                        return (
                                            <div key={index} style={{ display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                                                    {rec.reason}
                                                </div>
                                                <MediaCard
                                                    item={item}
                                                    existingStatus={existingItem?.status}
                                                    onAddSuccess={fetchWatchlist}
                                                    showServiceBadge={rec.service_name}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p style={{ color: '#666', fontStyle: 'italic' }}>
                                    No similar content found based on your watched items. Try watching more shows!
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
