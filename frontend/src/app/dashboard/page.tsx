'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import styles from './dashboard.module.css';
import Link from 'next/link';
import { Subscription, Recommendation } from '@/lib/types';

export default function DashboardOverview() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [subsRes, recsRes] = await Promise.all([
                    api.get('/subscriptions/'),
                    api.get('/recommendations/')
                ]);
                setSubscriptions(subsRes.data);
                setRecommendations(recsRes.data);
            } catch (error) {
                console.error('Failed to fetch data', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const totalCost = subscriptions.reduce((acc, sub) => acc + sub.cost, 0);
    const watchNowRecs = recommendations.filter(r => r.type === 'watch_now');
    const cancelRecs = recommendations.filter(r => r.type === 'cancel');

    if (loading) return <div className={styles.loading}>Loading...</div>;

    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>Overview</h1>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <h3>Total Monthly Cost</h3>
                    <p className={styles.statValue}>${totalCost.toFixed(2)}</p>
                </div>
                <div className={styles.statCard}>
                    <h3>Active Subscriptions</h3>
                    <p className={styles.statValue}>{subscriptions.length}</p>
                </div>
                <div className={styles.statCard}>
                    <h3>Potential Savings</h3>
                    <p className={styles.statValue} style={{ color: '#2e7d32' }}>
                        ${cancelRecs.reduce((acc, r) => acc + r.savings, 0).toFixed(2)}
                    </p>
                </div>
            </div>

            <div className={styles.content}>
                <div className={styles.leftColumn} style={{ width: '100%' }}>
                    <section className={styles.listSection}>
                        <h2>Quick Actions</h2>
                        <div className={styles.quickActions}>
                            <Link href="/dashboard/subscriptions" className={styles.actionCard}>
                                <h3>Manage Subscriptions</h3>
                                <p>Add or remove services</p>
                            </Link>
                            <Link href="/dashboard/watchlist" className={styles.actionCard}>
                                <h3>Update Watchlist</h3>
                                <p>Add new movies & shows</p>
                            </Link>
                            <Link href="/dashboard/recommendations" className={styles.actionCard}>
                                <h3>View Recommendations</h3>
                                <p>
                                    {watchNowRecs.length} Watch Now • {cancelRecs.length} Unused
                                </p>
                            </Link>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
