'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import styles from '../dashboard.module.css';
import { Recommendation } from '@/lib/types';

export default function RecommendationsPage() {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecommendations();
    }, []);

    const fetchRecommendations = async () => {
        try {
            const response = await api.get('/recommendations/');
            setRecommendations(response.data);
        } catch (error) {
            console.error('Failed to fetch recommendations', error);
        } finally {
            setLoading(false);
        }
    };

    const watchNowRecs = recommendations.filter(r => r.type === 'watch_now');
    const cancelRecs = recommendations.filter(r => r.type === 'cancel');
    const similarRecs = recommendations.filter(r => r.type === 'similar_content');

    if (loading) return <div className={styles.loading}>Loading...</div>;

    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>Smart Recommendations</h1>

            <div className={styles.content}>
                <div className={styles.leftColumn} style={{ width: '100%' }}>
                    <section className={styles.listSection}>
                        {recommendations.length === 0 && (
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
                        {similarRecs.length > 0 && (
                            <div className={styles.recGroup} style={{ marginTop: '1.5rem' }}>
                                <h3 className={styles.recGroupTitle} style={{ color: '#1976d2' }}>
                                    🎬 You Might Like
                                </h3>
                                <div className={styles.recGrid}>
                                    {similarRecs.map((rec, index) => (
                                        <div key={index} className={`${styles.recCard}`} style={{
                                            backgroundColor: '#e3f2fd',
                                            borderColor: '#90caf9'
                                        }}>
                                            <div className={styles.recHeader}>
                                                <h4>{rec.items[0]}</h4>
                                                <span className={styles.badge} style={{ backgroundColor: '#1976d2' }}>
                                                    {rec.service_name}
                                                </span>
                                            </div>
                                            <p className={styles.recReason}>{rec.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
