'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import styles from './dashboard.module.css';
import { useRecommendations } from '@/context/RecommendationsContext';

export default function DashboardOverview() {
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState({ total_cost: 0, active_subs: 0 });
    const { dashboardRecs, loadingDashboard } = useRecommendations();

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const [userRes, subRes] = await Promise.all([
                api.get('/users/me/'),
                api.get('/subscriptions/')
            ]);
            setUser(userRes.data);

            const subs = subRes.data;
            const totalCost = subs.reduce((acc: number, sub: any) => acc + sub.cost, 0);
            setStats({
                total_cost: totalCost,
                active_subs: subs.length
            });
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        }
    };

    const watchNowRecs = dashboardRecs.filter(r => r.type === 'watch_now').slice(0, 3);

    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>Welcome back, {user?.email?.split('@')[0]}!</h1>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <h3>Monthly Spend</h3>
                    <p className={styles.statValue}>${stats.total_cost.toFixed(2)}</p>
                </div>
                <div className={styles.statCard}>
                    <h3>Active Subscriptions</h3>
                    <p className={styles.statValue}>{stats.active_subs}</p>
                </div>
            </div>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Quick Watch</h2>
                {loadingDashboard ? (
                    <p>Loading recommendations...</p>
                ) : watchNowRecs.length > 0 ? (
                    <div className={styles.recGrid}>
                        {watchNowRecs.map((rec, index) => (
                            <div key={index} className={`${styles.recCard} ${styles.recCardGreen}`}>
                                <div className={styles.recHeader}>
                                    <h4>{rec.service_name}</h4>
                                    <span className={styles.badge}>Included</span>
                                </div>
                                <p className={styles.recReason}>{rec.reason}</p>
                                <div className={styles.recTags}>
                                    {rec.items.slice(0, 3).map((item, i) => (
                                        <span key={i} className={styles.tag}>{item}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ color: '#666' }}>Add items to your watchlist to get recommendations!</p>
                )}
            </div>
        </div>
    );
}
