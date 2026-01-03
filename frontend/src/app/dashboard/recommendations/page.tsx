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

const TRENDING_VISIBLE = 4;

import ConfirmationModal from '@/components/ConfirmationModal';

// ... (imports)

export default function RecommendationsPage() {
    const {
        dashboardRecs,
        similarRecs,
        loadingDashboard,
        loadingSimilar,
        refreshRecommendations,
        fetchSimilarData: fetchSimilarRecs
    } = useRecommendations();

    const [watchlist, setWatchlist] = useState<Array<{ id: number; tmdb_id: number; status: string; user_rating?: number; title?: string }>>([]); // Added title for consistency
    const [refreshing, setRefreshing] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [trendingIndex, setTrendingIndex] = useState(0);

    // Deletion State
    const [itemToRemove, setItemToRemove] = useState<{ id: number; title: string } | null>(null);

    useEffect(() => {
        fetchWatchlist();
    }, []);

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
            // Only refresh similar content
            await api.post('/recommendations/refresh?type=similar');
            // Only fetch similar recs
            await fetchSimilarRecs();
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
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={handlePrevTrending}
                                disabled={trendingIndex === 0}
                                className={styles.carouselBtn}
                                style={{
                                    padding: '8px',
                                    borderRadius: '50%',
                                    border: '1px solid #ddd',
                                    background: 'white',
                                    color: '#111827',
                                    cursor: trendingIndex === 0 ? 'default' : 'pointer',
                                    opacity: trendingIndex === 0 ? 0.3 : 1
                                }}
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={handleNextTrending}
                                disabled={trendingIndex + TRENDING_VISIBLE >= trendingRecs.length}
                                className={styles.carouselBtn}
                                style={{
                                    padding: '8px',
                                    borderRadius: '50%',
                                    border: '1px solid #ddd',
                                    background: 'white',
                                    color: '#111827',
                                    cursor: trendingIndex + TRENDING_VISIBLE >= trendingRecs.length ? 'default' : 'pointer',
                                    opacity: trendingIndex + TRENDING_VISIBLE >= trendingRecs.length ? 0.3 : 1
                                }}
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
                    <div className={styles.grid}>
                        {cancelRecs.map((rec, index) => (
                            <div key={index} className={styles.recommendationItem} style={{ cursor: 'default' }}>
                                <div className={styles.cardHeader}>
                                    <span className={styles.serviceName}>{rec.service_name}</span>
                                    <span className={`${styles.badge} ${styles.badgeRed}`}>Save ${rec.savings}</span>
                                </div>
                                <p className={styles.cardReason} style={{ marginBottom: 0 }}>{rec.reason}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Unified AI Analyst Entry Point */}
            <section className={styles.section}>
                <div style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                    borderRadius: '16px',
                    padding: '2rem',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.3)'
                }}>
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <Sparkles size={20} className="text-yellow-300" />
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.8)' }}>
                                Unified Intelligence
                            </span>
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', lineHeight: 1.2 }}>
                            Optimize Your Subscriptions & Discover Gems
                        </h2>
                        <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.9)', maxWidth: '500px', margin: 0 }}>
                            Get financial strategy, customized picks, and check for missing content gaps.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAIModal(true)}
                        style={{
                            background: 'white',
                            color: '#4f46e5',
                            border: 'none',
                            padding: '1rem 2rem',
                            borderRadius: '12px',
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            transition: 'transform 0.2s'
                        }}
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
                    <div className={styles.emptyState}>Finding personalized recommendations...</div>
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
                                        {rec.reason}
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
                        No recommendations found. Try adding more items to your watchlist!
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
