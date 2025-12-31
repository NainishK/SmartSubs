'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { PlusCircle, Info, Sparkles, TrendingUp, Wallet, Search } from 'lucide-react';
import MediaCard from '@/components/MediaCard'; // Import MediaCard
import styles from './dashboard.module.css';
import { useRecommendations } from '@/context/RecommendationsContext';
import { formatCurrency } from '@/lib/currency';
import { WatchlistItem } from '@/lib/types'; // Import WatchlistItem type

interface DashboardStats {
    total_cost: number;
    active_subs: number;
    yearly_projection: number;
    top_service: {
        name: string;
        cost: number;
    };
}

interface SpendingCategory {
    name: string;
    cost: number;
    color: string;
}


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
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const { dashboardRecs, loadingDashboard } = useRecommendations();
    const [spendingDist, setSpendingDist] = useState<any[]>([]);
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);



    useEffect(() => {
        const fetchData = async () => {
            try {
                const [userRes, statsRes, spendingRes, watchlistRes] = await Promise.all([
                    api.get('/users/me/'),
                    api.get('/users/me/stats'),
                    api.get('/users/me/spending'),
                    api.get('/watchlist/')
                ]);
                setUser(userRes.data);
                setStats(statsRes.data);
                setSpendingDist(spendingRes.data); // Assuming spendingRes.data is the spending distribution
                setWatchlist(watchlistRes.data);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            }
        };
        fetchData();
        // Recs are handled by context
    }, []);


    // Helper to check status
    const getWatchlistStatus = (title: string) => {
        const item = watchlist.find(w => w.title === title);
        return item ? item.status : undefined;
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
    const topServiceColor = spendingDist.find(d => d.name === stats?.top_service?.name)?.color || '#f5a623';

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
                {/* Total Cost */}
                <div className={styles.statCard}>
                    <div>
                        <div className={styles.statLabel}>Monthly Average</div>
                        <h2 className={styles.statValue}>
                            {stats ? formatCurrency(stats.total_cost || 0, user?.country || 'US') : <span className={styles.skeletonText}>Loading...</span>}
                        </h2>
                    </div>
                    <div className={styles.statSubtext}>
                        Normalized across {stats?.active_subs || 0} services
                    </div>
                </div>

                {/* Yearly Projection */}
                <div className={styles.statCard}>
                    <div>
                        <div className={styles.statLabel}>Yearly Projection</div>
                        <h2 className={styles.statValue}>
                            {stats ? formatCurrency(stats.yearly_projection || 0, user?.country || 'US') : <span className={styles.skeletonText}>---</span>}
                        </h2>
                    </div>
                    <div className={styles.statSubtext}>
                        Estimated annual cost
                    </div>
                </div>

                {/* Avg Cost */}
                <div className={styles.statCard}>
                    <div>
                        <div className={styles.statLabel}>Avg. Cost / Sub</div>
                        <h2 className={styles.statValue}>
                            {stats ? formatCurrency(stats.active_subs > 0 ? ((stats.total_cost || 0) / stats.active_subs) : 0, user?.country || 'US') : '--'}
                        </h2>
                    </div>
                    <span className={styles.statSubtext}>Per subscription</span>
                </div>

                {/* Top Service */}
                <div className={styles.statCard} style={{ borderLeft: `4px solid ${topServiceColor}` }}>
                    <div>
                        <div className={styles.statLabel}>Top Expense</div>
                        <h2 className={styles.statValue}>
                            {stats ? (stats.top_service?.name || '-') : <span className={styles.skeletonText}>---</span>}
                        </h2>
                    </div>
                    <div className={styles.statSubtext} style={{ color: topServiceColor, fontWeight: 600 }}>
                        {stats ? formatCurrency(stats.top_service?.cost || 0, user?.country || 'US') : '$0'} /mo
                    </div>
                </div>
            </div>

            {/* Spending Breakdown */}
            {spendingDist.length > 0 && (
                <div className={styles.spendingSection}>
                    <h2 className={styles.sectionTitle}>Spending Breakdown</h2>
                    <div className={styles.progressBarContainer}>
                        {spendingDist.map((item, index) => (
                            <div
                                key={index}
                                className={styles.progressBarSegment}
                                style={{
                                    width: `${stats?.total_cost ? (item.cost / stats.total_cost) * 100 : 0}%`,
                                    backgroundColor: item.color
                                }}
                                title={`${item.name}: ${formatCurrency(item.cost)}`}
                            />
                        ))}
                    </div>
                    <div className={styles.legend}>
                        {spendingDist.map((item, index) => (
                            <div key={index} className={styles.legendItem}>
                                <div className={styles.legendDot} style={{ backgroundColor: item.color }} />
                                <span>{item.name} ({Math.round(stats?.total_cost ? (item.cost / stats.total_cost) * 100 : 0)}%)</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}


            {/* Quick Watch Recommendations (Rows) */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Note: SuccessIcon was not imported, reverting to TrendingUp or similar if needed, or removing */}
                    <TrendingUp size={20} color="#10b981" />
                    <span>Quick Watch</span>
                </h2>
                {loadingDashboard ? (
                    <p>Loading...</p>
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
                                        Available Now
                                    </span>
                                </div>
                                <p className={styles.recReason}>{rec.reason}</p>
                                <div className={styles.recFooter}>
                                    <span className={styles.tagLabel}>Titles:</span>
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
