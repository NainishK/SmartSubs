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

    const [watchlist, setWatchlist] = useState<Array<{ tmdb_id: number; status: string }>>([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchWatchlist();
    }, []);

    const fetchWatchlist = async () => {
        try {
            const response = await api.get('/watchlist/');
            setWatchlist(response.data.map((item: any) => ({ tmdb_id: item.tmdb_id, status: item.status })));
        } catch (error) {
            console.error('Failed to fetch watchlist', error);
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
                <button
                    onClick={handleRefresh}
                    disabled={refreshing || loadingSimilar}
                    style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#1976d2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: (refreshing || loadingSimilar) ? 'not-allowed' : 'pointer',
                        opacity: (refreshing || loadingSimilar) ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    {refreshing ? 'Refreshing...' : '🔄 Refresh'}
                </button>
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

                        {/* Cancel Section */}
                        {cancelRecs.length > 0 && (
                            <div className={styles.recGroup} style={{ marginTop: '1.5rem' }}>
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

                        {/* Similar Content Section */}
                        <div className={styles.recGroup} style={{ marginTop: '1.5rem' }}>
                            <h3 className={styles.recGroupTitle} style={{ color: '#1976d2' }}>
                                🎬 You Might Like
                            </h3>

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
