'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import styles from './recommendations.module.css';
import { Recommendation } from '@/lib/types';
import MediaCard, { MediaItem } from '@/components/MediaCard';
import { useRecommendations } from '@/context/RecommendationsContext';
import { PlayCircle, Lightbulb, TrendingUp, Sparkles, RefreshCw, XCircle, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { ServiceIcon } from '@/components/ServiceIcon';
import AIInsightsModal from '@/components/AIInsightsModal';
import { formatCurrency } from '@/lib/currency';

const TRENDING_VISIBLE = 4;

import ConfirmationModal from '@/components/ConfirmationModal';

// ... (imports)

export default function RecommendationsPage() {
    // ... existing hooks
    const {
        dashboardRecs,
        similarRecs,
        loadingDashboard,
        loadingSimilar,
        refreshRecommendations,
        fetchSimilarData: fetchSimilarRecs
    } = useRecommendations();

    const [watchlist, setWatchlist] = useState<Array<{ id: number; tmdb_id: number; status: string; user_rating?: number; title?: string }>>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [trendingIndex, setTrendingIndex] = useState(0);
    const [userCountry, setUserCountry] = useState('US'); // Default to US to prevent hydration mismatch, or better yet, wait for load?

    // Deletion State
    const [itemToRemove, setItemToRemove] = useState<{ id: number; title: string } | null>(null);

    useEffect(() => {
        fetchWatchlist();
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const response = await api.get('/users/me/'); // Added trailing slash to match backend
            if (response.data && response.data.country) {
                setUserCountry(response.data.country);
            }
        } catch (error) {
            console.error('Failed to fetch user profile', error);
        }
    };

    const fetchWatchlist = async () => {
        try {
            const response = await api.get('/watchlist/');
            setWatchlist(response.data.map((item: any) => ({
                id: item.id,
                tmdb_id: item.tmdb_id,
                status: item.status,
                user_rating: item.user_rating,
                title: item.title
            })));
        } catch (error) {
            console.error('Failed to fetch watchlist', error);
        }
    };

    const confirmRemove = (id: number, title: string) => {
        setItemToRemove({ id, title });
    };

    const handleRemove = async () => {
        if (!itemToRemove) return;
        try {
            await api.delete(`/watchlist/${itemToRemove.id}`);
            await fetchWatchlist(); // Refresh local state
            setItemToRemove(null);
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    // ... (rest of simple handlers)

    const handleNextTrending = () => {
        setTrendingIndex(prev =>
            prev + TRENDING_VISIBLE < trendingRecs.length ? prev + 1 : prev
        );
    };

    const handlePrevTrending = () => {
        setTrendingIndex(prev => prev > 0 ? prev - 1 : 0);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            // Refresh both dashboard and similar content
            await api.post('/recommendations/refresh');
            await refreshRecommendations(true);
        } catch (error) {
            console.error(error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleQuickWatch = (itemName: string, serviceName: string) => {
        const query = `Watch ${itemName} on ${serviceName}`;
        window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
    };

    const trendingRecs = dashboardRecs.filter(r => r.type === 'trending');
    const cancelRecs = dashboardRecs.filter(r => r.type === 'cancel' && r.service_name !== 'YouTube Premium');

    if (loadingDashboard && dashboardRecs.length === 0) return (
        <div className={styles.container}>
            <div className={styles.emptyState}>Loading recommendations...</div>
        </div>
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.pageTitle}>Smart Recommendations</h1>
            </div>

            <AIInsightsModal
                isOpen={showAIModal}
                onClose={() => setShowAIModal(false)}
                watchlist={watchlist}
                onWatchlistUpdate={fetchWatchlist}
            />

            {/* Trending Section - Carousel */}
            {trendingRecs.length > 0 && (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle} style={{ color: '#ec4899' }}>
                            <PlayCircle className={styles.sectionIcon} /> Trending on Your Services
                        </h2>
                        {/* Carousel Controls */}
                        <div className={styles.carouselControls}>
                            <button
                                onClick={handlePrevTrending}
                                disabled={trendingIndex === 0}
                                className={styles.carouselBtn}
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={handleNextTrending}
                                disabled={trendingIndex + TRENDING_VISIBLE >= trendingRecs.length}
                                className={styles.carouselBtn}
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                    <div className={styles.grid}>
                        {trendingRecs.slice(trendingIndex, trendingIndex + TRENDING_VISIBLE).map((rec, index) => {
                            const tmdbId = rec.tmdb_id || 0;
                            const existingItem = watchlist.find(w => w.tmdb_id === tmdbId || (w.tmdb_id === 0 && rec.items[0] === 'Title needed')); // Strict ID match preference

                            return (
                                <div key={`${trendingIndex}-${index}`} className={styles.recommendationItem}>
                                    <MediaCard
                                        item={{
                                            id: tmdbId,
                                            dbId: existingItem?.id,
                                            title: rec.items[0],
                                            overview: rec.overview || '',
                                            poster_path: rec.poster_path || '',
                                            vote_average: rec.vote_average || 0,
                                            media_type: rec.media_type || 'movie',
                                            user_rating: existingItem?.user_rating || 0,
                                            status: existingItem?.status
                                        }}
                                        showServiceBadge={rec.service_name}
                                        customBadgeColor="#db2777"
                                        existingStatus={existingItem?.status}
                                        onAddSuccess={fetchWatchlist}
                                        onStatusChange={() => fetchWatchlist()}
                                        onRemove={existingItem ? () => confirmRemove(existingItem.id, rec.items[0]) : undefined}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </section>
            )}

            {/* Unused Subscriptions */}
            {cancelRecs.length > 0 && (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle} style={{ color: '#dc2626' }}>
                            <AlertTriangle className={styles.sectionIcon} /> Unused Subscriptions
                        </h2>
                    </div>
                    <div className={`${styles.grid} ${styles.unusedGrid}`}>
                        {cancelRecs.map((rec, index) => (
                            <div key={index} className={`${styles.recommendationItem} ${styles.unusedItem}`} style={{ cursor: 'default' }}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.unusedServiceInfo}>
                                        <ServiceIcon
                                            name={rec.service_name}
                                            className={styles.serviceLogo}
                                            fallbackClassName={styles.serviceLogoFallback}
                                        />
                                        <span className={styles.serviceName}>{rec.service_name}</span>
                                    </div>


                                    <span className={`${styles.badge} ${styles.badgeRed}`}>
                                        Save {formatCurrency(rec.savings, userCountry)}
                                        <span style={{ fontSize: '0.8em', opacity: 0.9, fontWeight: 500 }}>
                                            {rec.billing_cycle?.toLowerCase() === 'yearly' ? '/yr' : '/mo'}
                                        </span>
                                    </span>
                                </div>
                                <p className={styles.cardReason} style={{ marginBottom: 0 }}>{rec.reason}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Unified AI Analyst Entry Point */}
            <section className={styles.section}>
                <div className={styles.aiBanner}>
                    <div className={styles.aiBannerContent}>
                        <div className={styles.aiLabel}>
                            <Sparkles size={18} className="text-yellow-300" style={{ color: '#fde047' }} />
                            <span className={styles.aiLabelText}>
                                Unified Intelligence
                            </span>
                        </div>
                        <h2 className={styles.aiBannerTitle}>
                            Optimize Your Subscriptions & Discover Gems
                        </h2>
                        <p className={styles.aiBannerDesc}>
                            Get financial strategy, customized picks, and check for missing content gaps.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAIModal(true)}
                        className={styles.aiLaunchBtn}
                    >
                        <Sparkles size={20} /> Launch AI Analyst
                    </button>
                </div>
            </section>

            {/* Similar Content Section */}
            <section className={styles.section} style={{ opacity: refreshing ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle} style={{ color: '#2563eb' }}>
                        <Lightbulb className={styles.sectionIcon} /> You Might Like
                    </h2>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing || loadingSimilar}
                        className={styles.refreshBtn}
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>

                {loadingSimilar && similarRecs.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Sparkles size={48} style={{ opacity: 0.2 }} />
                        <p>Finding personalized recommendations...</p>
                    </div>
                ) : similarRecs.length > 0 ? (
                    <div className={styles.grid}>
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
                                <div key={index} className={styles.recommendationItem}>
                                    <div className={styles.reasonHeader} title={rec.reason}>
                                        <div className={styles.reasonBadge}>
                                            <Lightbulb size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                                            {rec.reason}
                                        </div>
                                    </div>
                                    <MediaCard
                                        item={item}
                                        existingStatus={existingItem?.status}
                                        onAddSuccess={fetchWatchlist}
                                        showServiceBadge={rec.service_name}
                                        onRemove={existingItem ? () => confirmRemove(existingItem.id, rec.items[0]) : undefined}
                                        onStatusChange={() => fetchWatchlist()}
                                    />
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <Lightbulb size={48} style={{ opacity: 0.2 }} />
                        <p>No recommendations found. Try adding more items to your watchlist!</p>
                    </div>
                )}
            </section>

            <ConfirmationModal
                isOpen={!!itemToRemove}
                onClose={() => setItemToRemove(null)}
                // Use a default title if itemToRemove is somehow null during fade-out
                title={`Remove ${itemToRemove?.title || 'Item'}?`}
                message={`Are you sure you want to remove ${itemToRemove?.title || 'this item'} from your watchlist?`}
                confirmLabel="Remove"
                onConfirm={handleRemove}
                isDangerous={true}
            />
        </div>
    );
}
