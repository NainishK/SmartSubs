'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import styles from './dashboard.module.css';
import { useRecommendations } from '@/context/RecommendationsContext';
import { formatCurrency } from '@/lib/currency';

const SERVICE_DOMAINS: Record<string, string> = {
    'Netflix': 'netflix.com',
    'Amazon Prime Video': 'primevideo.com',
    'Disney Plus': 'disneyplus.com',
    'Spotify': 'spotify.com',
    'Hulu': 'hulu.com',
    'Max': 'max.com',
    'Apple TV+': 'apple.com',
    'YouTube Premium': 'youtube.com',
    'Peacock': 'peacocktv.com',
    'Paramount+': 'paramountplus.com'
};

const getServiceLogo = (name: string) => {
    const domain = SERVICE_DOMAINS[name];
    if (domain) {
        return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
    }

    // Fallback search for unknown services
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `https://www.google.com/s2/favicons?sz=128&domain=${slug}.com`;
};

export default function DashboardOverview() {
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState({
        total_cost: 0,
        active_subs: 0,
        yearly_projection: 0,
        top_service: { name: '-', cost: 0 }
    });
    const { dashboardRecs, loadingDashboard } = useRecommendations();
    const [spendingDist, setSpendingDist] = useState<any[]>([]);

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

            // Normalize all costs to monthly for accurate stats
            const normalizedSubs = subs.map((sub: any) => ({
                ...sub,
                monthlyCost: sub.billing_cycle === 'yearly' ? sub.cost / 12 : sub.cost
            }));

            const totalMonthlyCost = normalizedSubs.reduce((acc: number, sub: any) => acc + sub.monthlyCost, 0);

            // Find top service by monthly impact
            const top = normalizedSubs.reduce((prev: any, current: any) =>
                (prev.monthlyCost > current.monthlyCost) ? prev : current,
                { service_name: '-', monthlyCost: 0 }
            );

            setStats({
                total_cost: totalMonthlyCost,
                active_subs: subs.length,
                yearly_projection: totalMonthlyCost * 12,
                top_service: {
                    name: top.service_name,
                    cost: top.monthlyCost
                }
            });

            // Calculate Spending Distribution (Top 3 + Others) using monthly equivalents
            const sortedSubs = [...normalizedSubs].sort((a, b) => b.monthlyCost - a.monthlyCost);
            const topSubs = sortedSubs.slice(0, 3);
            const otherCost = sortedSubs.slice(3).reduce((acc, sub) => acc + sub.monthlyCost, 0);

            const dist = topSubs.map((sub, index) => ({
                name: sub.service_name,
                cost: sub.monthlyCost,
                color: getServiceColor(index)
            }));

            if (otherCost > 0) {
                dist.push({ name: 'Others', cost: otherCost, color: '#e0e0e0' });
            }
            setSpendingDist(dist);

        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        }
    };

    const getServiceColor = (index: number) => {
        const colors = ['#0070f3', '#7928ca', '#f5a623', '#10b981'];
        return colors[index % colors.length];
    };

    // Fallback Avatar Component
    const ServiceIcon = ({ name, logoUrl: propLogoUrl }: { name: string, logoUrl?: string }) => {
        const [error, setError] = useState(false);
        const logoUrl = propLogoUrl || getServiceLogo(name);

        if (error || !logoUrl) {
            return (
                <div
                    className={styles.fallbackLogo}
                    style={{ backgroundColor: stringToColor(name) }}
                >
                    {name.charAt(0).toUpperCase()}
                </div>
            );
        }

        return (
            <img
                src={logoUrl}
                alt={`${name} logo`}
                className={styles.serviceLogo}
                onError={() => setError(true)}
            />
        );
    };

    // Auto-generate consistent pastel color for fallback
    const stringToColor = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + '00000'.substring(0, 6 - c.length) + c;
    };

    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const watchNowRecs = dashboardRecs ? dashboardRecs.filter(r => r.type === 'watch_now').slice(0, 3) : [];

    // Find color for the top service to stay consistent with the graph
    const topServiceColor = spendingDist.find(d => d.name === stats.top_service.name)?.color || '#f5a623';

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.pageTitle}>Dashboard Overview</h1>
                    <p className={styles.dateLabel}>{currentDate}</p>
                </div>
            </div>

            {/* Premium Stats Grid */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Monthly Average</span>
                    <p className={styles.statValue}>{formatCurrency(stats.total_cost, user?.country || 'US')}</p>
                    <span className={styles.statSubtext}>Normalized across {stats.active_subs} services</span>
                </div>

                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Yearly Projection</span>
                    <p className={styles.statValue}>{formatCurrency(stats.yearly_projection, user?.country || 'US')}</p>
                    <span className={styles.statSubtext}>Estimated annual cost</span>
                </div>

                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Avg. Cost / Sub</span>
                    <p className={styles.statValue}>
                        {formatCurrency(stats.active_subs > 0 ? (stats.total_cost / stats.active_subs) : 0, user?.country || 'US')}
                    </p>
                    <span className={styles.statSubtext}>Per subscription</span>
                </div>

                <div className={styles.statCard} style={{ borderLeft: `4px solid ${topServiceColor}` }}>
                    <span className={styles.statLabel}>Top Expense</span>
                    <div style={{ marginTop: 'auto' }}>
                        <p className={styles.statValue} style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>{stats.top_service.name}</p>
                        <span className={styles.statSubtext} style={{ color: topServiceColor, fontWeight: 600 }}>{formatCurrency(stats.top_service.cost, user?.country || 'US')} / mo</span>
                    </div>
                </div>
            </div>

            {/* Spending Breakdown */}
            <div className={styles.spendingSection}>
                <h3 className={styles.sectionTitle}>Spending Breakdown</h3>
                <div className={styles.progressBarContainer}>
                    {spendingDist.map((item, index) => (
                        <div
                            key={index}
                            className={styles.progressBarSegment}
                            style={{
                                width: `${(item.cost / stats.total_cost) * 100}%`,
                                backgroundColor: item.color
                            }}
                            title={`${item.name}: ${formatCurrency(item.cost, user?.country || 'US')}`}
                        />
                    ))}
                </div>
                <div className={styles.legend}>
                    {spendingDist.map((item, index) => (
                        <div key={index} className={styles.legendItem}>
                            <div className={styles.legendDot} style={{ backgroundColor: item.color }} />
                            <span>{item.name} ({Math.round((item.cost / stats.total_cost) * 100)}%)</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Quick Watch</h2>
                {loadingDashboard ? (
                    <p>Loading recommendations...</p>
                ) : watchNowRecs.length > 0 ? (
                    <div className={styles.recGrid}>
                        {watchNowRecs.map((rec, index) => (
                            <div key={index} className={styles.recCard}>
                                <div className={styles.recHeader}>
                                    <div className={styles.serviceIdentity}>
                                        <ServiceIcon name={rec.service_name} logoUrl={rec.logo_url} />
                                        <h4 className={styles.serviceName}>{rec.service_name}</h4>
                                    </div>
                                    <span className={styles.badge}>
                                        <span className={styles.dot}></span> Included
                                    </span>
                                </div>
                                <p className={styles.recReason}>{rec.reason}</p>
                                <div className={styles.recFooter}>
                                    <span className={styles.tagLabel}>Suggested:</span>
                                    <div className={styles.recTags}>
                                        {rec.items.slice(0, 3).map((item, i) => (
                                            <a
                                                key={i}
                                                className={styles.tag}
                                                href={`https://www.google.com/search?q=${encodeURIComponent('Watch ' + item + ' on ' + rec.service_name)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="Search where to watch"
                                            >
                                                {item} ↗
                                            </a>
                                        ))}
                                    </div>
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
