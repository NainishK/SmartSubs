'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import styles from '../dashboard.module.css';
import { Recommendation } from '@/lib/types';
import MediaCard, { MediaItem } from '@/components/MediaCard';

export default function RecommendationsPage() {
    const [dashboardRecs, setDashboardRecs] = useState<Recommendation[]>([]);
    const [similarRecs, setSimilarRecs] = useState<Recommendation[]>([]);
    const [watchlist, setWatchlist] = useState<Array<{ tmdb_id: number; status: string }>>([]);
    const [loadingDashboard, setLoadingDashboard] = useState(true);
    const [loadingSimilar, setLoadingSimilar] = useState(true);

    useEffect(() => {
        fetchDashboardData();
        fetchSimilarData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [recRes, watchRes] = await Promise.all([
                api.get('/recommendations/dashboard'),
                api.get('/watchlist/')
            ]);
            setDashboardRecs(recRes.data);
            setWatchlist(watchRes.data.map((item: any) => ({ tmdb_id: item.tmdb_id, status: item.status })));
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        } finally {
            setLoadingDashboard(false);
        }
    };

    const fetchSimilarData = async () => {
        try {
            const response = await api.get('/recommendations/similar');
            setSimilarRecs(response.data);
        } catch (error) {
            console.error('Failed to fetch similar recommendations', error);
        } finally {
            setLoadingSimilar(false);
        }
    };

    const refreshWatchlist = async () => {
        try {
            const response = await api.get('/watchlist/');
            setWatchlist(response.data.map((item: any) => ({ tmdb_id: item.tmdb_id, status: item.status })));
        } catch (error) {
            console.error('Failed to refresh watchlist', error);
        }
    };

    const watchNowRecs = dashboardRecs.filter(r => r.type === 'watch_now');
    const cancelRecs = dashboardRecs.filter(r => r.type === 'cancel');

    if (loadingDashboard) return <div className={styles.loading}>Loading...</div>;

    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>Smart Recommendations</h1>

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

                            {loadingSimilar ? (
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
                                                    onAddSuccess={refreshWatchlist}
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
