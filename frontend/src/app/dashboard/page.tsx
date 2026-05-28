'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { PlusCircle, Info, Sparkles, TrendingUp, Wallet, Search, BarChart2, Play, Tv, Check, Plus, Minus, Star, Film, ChevronRight } from 'lucide-react';
import MediaCard from '@/components/MediaCard';
import styles from './dashboard.module.css';
import { useRecommendations } from '@/context/RecommendationsContext';
import { formatCurrency } from '@/lib/currency';
import { WatchlistItem } from '@/lib/types';
import CoverageDashboard from '@/components/CoverageDashboard';
import MediaDetailsModal from '@/components/MediaDetailsModal';

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
    
    // Premium Visual Quick Watch State & Modal Sync
    const [localWatchNowRecs, setLocalWatchNowRecs] = useState<any[]>([]);
    const [selectedItemForModal, setSelectedItemForModal] = useState<any>(null);

    useEffect(() => {
        if (dashboardRecs) {
            setLocalWatchNowRecs(dashboardRecs.filter(r => r.type === 'watch_now').slice(0, 3));
        }
    }, [dashboardRecs]);

    const handleQuickIncrementEpisode = async (e: React.MouseEvent, item: any) => {
        e.stopPropagation(); // Stop opening the modal
        if (!item.dbId) return;

        const newEp = (item.current_episode || 0) + 1;
        if (item.total_episodes && item.total_episodes > 0 && newEp > item.total_episodes) {
            return; // Cap at total episodes
        }

        // Optimistic UI Update
        setLocalWatchNowRecs(prev => prev.map(rec => ({
            ...rec,
            items: rec.items.map((i: any) => {
                if (typeof i !== 'string' && i.dbId === item.dbId) {
                    return { ...i, current_episode: newEp };
                }
                return i;
            })
        })));

        try {
            await api.put(`/watchlist/${item.dbId}/progress`, {
                current_season: item.current_season || 1,
                current_episode: newEp
            });
        } catch (err) {
            console.error("Failed to update progress", err);
            // Revert state if error
            if (dashboardRecs) {
                setLocalWatchNowRecs(dashboardRecs.filter(r => r.type === 'watch_now').slice(0, 3));
            }
        }
    };

    const handleQuickDecrementEpisode = async (e: React.MouseEvent, item: any) => {
        e.stopPropagation(); // Stop opening the modal
        if (!item.dbId) return;

        const newEp = Math.max(0, (item.current_episode || 0) - 1);

        // Optimistic UI Update
        setLocalWatchNowRecs(prev => prev.map(rec => ({
            ...rec,
            items: rec.items.map((i: any) => {
                if (typeof i !== 'string' && i.dbId === item.dbId) {
                    return { ...i, current_episode: newEp };
                }
                return i;
            })
        })));

        try {
            await api.put(`/watchlist/${item.dbId}/progress`, {
                current_season: item.current_season || 1,
                current_episode: newEp
            });
        } catch (err) {
            console.error("Failed to update progress", err);
            // Revert state if error
            if (dashboardRecs) {
                setLocalWatchNowRecs(dashboardRecs.filter(r => r.type === 'watch_now').slice(0, 3));
            }
        }
    };

    const handleModalRate = async (dbId: number, rating: number) => {
        try {
            await api.put(`/watchlist/${dbId}/rate`, { user_rating: rating });
            
            // Sync local state
            setLocalWatchNowRecs(prev => prev.map(rec => ({
                ...rec,
                items: rec.items.map((i: any) => {
                    if (typeof i !== 'string' && i.dbId === dbId) {
                        const updated = { ...i, user_rating: rating };
                        if (selectedItemForModal && selectedItemForModal.dbId === dbId) {
                            setSelectedItemForModal(updated);
                        }
                        return updated;
                    }
                    return i;
                })
            })));
        } catch (err) {
            console.error("Failed to update rating", err);
        }
    };

    const handleModalProgressChange = async (dbId: number, season: number, episode: number) => {
        try {
            await api.put(`/watchlist/${dbId}/progress`, {
                current_season: season,
                current_episode: episode
            });

            // Sync local state
            setLocalWatchNowRecs(prev => prev.map(rec => ({
                ...rec,
                items: rec.items.map((i: any) => {
                    if (typeof i !== 'string' && i.dbId === dbId) {
                        const updated = { ...i, current_season: season, current_episode: episode };
                        if (selectedItemForModal && selectedItemForModal.dbId === dbId) {
                            setSelectedItemForModal(updated);
                        }
                        return updated;
                    }
                    return i;
                })
            })));
        } catch (err) {
            console.error("Failed to update progress", err);
        }
    };

    const handleModalNotesChange = async (dbId: number, notes: string) => {
        try {
            await api.put(`/watchlist/${dbId}/notes`, { notes });

            // Sync local state
            setLocalWatchNowRecs(prev => prev.map(rec => ({
                ...rec,
                items: rec.items.map((i: any) => {
                    if (typeof i !== 'string' && i.dbId === dbId) {
                        const updated = { ...i, notes };
                        if (selectedItemForModal && selectedItemForModal.dbId === dbId) {
                            setSelectedItemForModal(updated);
                        }
                        return updated;
                    }
                    return i;
                })
            })));
        } catch (err) {
            console.error("Failed to update notes", err);
        }
    };



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
                <div className={styles.spendingSection} style={{ marginBottom: '2rem' }}>
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
                                title={`${item.name}: ${formatCurrency(item.cost, user?.country || 'US')}`}
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

            {/* Coverage Dashboard */}
            <div style={{ marginBottom: '2rem' }}>
                <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                    <BarChart2 size={20} color="#6366f1" />
                    <span>Coverage Dashboard</span>
                </h2>
                <CoverageDashboard userCountry={user?.country || 'IN'} />
            </div>



            {/* Quick Watch Recommendations (Rows) */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={20} color="#10b981" />
                    <span>Quick Watch</span>
                </h2>
                {loadingDashboard ? (
                    <p>Loading...</p>
                ) : localWatchNowRecs.length > 0 ? (
                    <div className={styles.recGrid}>
                        {localWatchNowRecs.map((rec, index) => (
                            <div key={index} className={styles.recCard}>
                                <div className={styles.recHeader} style={{ borderBottom: 'none', marginBottom: '0.25rem', paddingBottom: '0.5rem' }}>
                                    <div className={styles.serviceIdentity}>
                                        <ServiceIcon name={rec.service_name} logoUrl={rec.logo_url} />
                                        <h4 className={styles.serviceName}>{rec.service_name}</h4>
                                    </div>
                                    <span className={styles.badge}>
                                        Available Now
                                    </span>
                                </div>

                                 <div className={styles.quickWatchContainer}>
                                     {rec.items.slice(0, 3).map((item: any, i: number) => {
                                         const isString = typeof item === 'string';
                                         if (isString) {
                                             return (
                                                 <a
                                                     key={i}
                                                     className={styles.tag}
                                                     href={`https://www.google.com/search?q=${encodeURIComponent('Watch ' + item + ' on ' + rec.service_name)}`}
                                                     target="_blank"
                                                     rel="noopener noreferrer"
                                                     style={{ alignSelf: 'flex-start' }}
                                                 >
                                                     {item} ↗
                                                 </a>
                                             );
                                         }

                                         const titleText = item.title || item.name || 'Untitled';
                                         const isTv = item.media_type === 'tv';
                                         const hasProgress = isTv && item.total_episodes > 0;
                                         const progressPct = hasProgress 
                                             ? Math.min(100, Math.round(((item.current_episode || 0) / item.total_episodes) * 100))
                                             : 0;

                                         return (
                                             <div 
                                                 key={i} 
                                                 className={styles.quickWatchItemCompact}
                                                 onClick={() => setSelectedItemForModal(item)}
                                             >
                                                 {/* Mini Poster left */}
                                                 <div className={styles.miniPosterWrapper}>
                                                     {item.poster_path ? (
                                                         <img 
                                                             src={`https://image.tmdb.org/t/p/w92${item.poster_path}`} 
                                                             alt={titleText}
                                                             className={styles.miniPosterImage}
                                                             loading="lazy"
                                                         />
                                                     ) : (
                                                         <div className={styles.miniPosterFallback}>
                                                             <Film size={16} />
                                                         </div>
                                                     )}
                                                 </div>

                                                 {/* Details right */}
                                                 <div className={styles.compactDetails}>
                                                     <div className={styles.compactHeaderRow}>
                                                         <h5 className={styles.compactTitle} title={titleText}>{titleText}</h5>
                                                         <a 
                                                             className={styles.compactPlayBtn}
                                                             href={`https://www.google.com/search?q=${encodeURIComponent('Watch ' + titleText + ' on ' + rec.service_name)}`}
                                                             target="_blank"
                                                             rel="noopener noreferrer"
                                                             onClick={(e) => e.stopPropagation()}
                                                             title={`Watch ${titleText} on ${rec.service_name}`}
                                                         >
                                                             <Play size={10} fill="currentColor" style={{ marginLeft: 1 }} />
                                                         </a>
                                                     </div>

                                                     <div className={styles.compactMetaRow}>
                                                         <span className={styles.compactType}>
                                                             {item.media_type === 'tv' ? 'TV' : 'Movie'}
                                                         </span>
                                                         {item.vote_average && (
                                                             <div className={styles.compactRating}>
                                                                 <Star size={10} fill="currentColor" />
                                                                 <span>{Number(item.vote_average).toFixed(1)}</span>
                                                             </div>
                                                         )}
                                                     </div>

                                                     {/* Progress trackers */}
                                                     {isTv ? (
                                                         <div className={styles.compactProgressSection} onClick={(e) => e.stopPropagation()}>
                                                             <button 
                                                                 className={styles.compactStepperButton}
                                                                 onClick={(e) => handleQuickDecrementEpisode(e, item)}
                                                                 disabled={!item.current_episode || item.current_episode === 0}
                                                                 title="Previous Episode"
                                                             >
                                                                 <Minus size={10} strokeWidth={2.5} />
                                                             </button>

                                                             <div className={styles.compactProgressInfo} style={{ textAlign: 'center', alignItems: 'center' }}>
                                                                 <span className={styles.compactProgressCount}>
                                                                     S{item.current_season || 1} · E{item.current_episode || 0}
                                                                     {item.total_episodes > 0 && ` / E${item.total_episodes}`}
                                                                 </span>
                                                                 {item.total_episodes > 0 && (
                                                                     <div className={styles.compactProgressBarTrack} title={`${progressPct}% watched`}>
                                                                         <div 
                                                                             className={styles.compactProgressBarFill} 
                                                                             style={{ width: `${progressPct}%` }}
                                                                         />
                                                                     </div>
                                                                 )}
                                                             </div>

                                                             <button 
                                                                 className={styles.compactStepperButton}
                                                                 onClick={(e) => handleQuickIncrementEpisode(e, item)}
                                                                 disabled={item.total_episodes > 0 && item.current_episode >= item.total_episodes}
                                                                 title="Next Episode"
                                                             >
                                                                 <Plus size={10} strokeWidth={2.5} />
                                                             </button>
                                                         </div>
                                                     ) : (
                                                         <div className={styles.compactMovieBadge}>
                                                             <Film size={10} />
                                                             <span>Full Movie</span>
                                                         </div>
                                                     )}
                                                 </div>
                                             </div>
                                         );
                                     })}
                                 </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ color: '#666' }}>Add items to your watchlist to get recommendations!</p>
                )}
            </div>

            {/* Media Details modal */}
            {selectedItemForModal && (
                <MediaDetailsModal
                    visible={!!selectedItemForModal}
                    onClose={() => setSelectedItemForModal(null)}
                    mediaType={selectedItemForModal.media_type}
                    tmdbId={selectedItemForModal.id}
                    initialData={{
                        title: selectedItemForModal.title || selectedItemForModal.name || '',
                        poster_path: selectedItemForModal.poster_path,
                        overview: selectedItemForModal.overview,
                        vote_average: selectedItemForModal.vote_average
                    }}
                    userRating={selectedItemForModal.user_rating || 0}
                    onRate={selectedItemForModal.dbId ? (rating) => handleModalRate(selectedItemForModal.dbId, rating) : undefined}
                    dbId={selectedItemForModal.dbId}
                    currentSeason={selectedItemForModal.current_season || 1}
                    currentEpisode={selectedItemForModal.current_episode || 0}
                    onProgressChange={selectedItemForModal.dbId ? (s, e) => handleModalProgressChange(selectedItemForModal.dbId, s, e) : undefined}
                    notes={selectedItemForModal.notes || ''}
                    onNotesChange={selectedItemForModal.dbId ? (notes) => handleModalNotesChange(selectedItemForModal.dbId, notes) : undefined}
                />
            )}

        </div>
    );
}
