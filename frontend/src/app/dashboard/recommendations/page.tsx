'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import styles from './recommendations.module.css';
import { Recommendation } from '@/lib/types';
import MediaCard, { MediaItem } from '@/components/MediaCard';
import { useRecommendations } from '@/context/RecommendationsContext';
import { PlayCircle, Lightbulb, TrendingUp, Sparkles, RefreshCw, XCircle, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { ServiceIcon } from '@/components/ServiceIcon';

const TRENDING_VISIBLE = 4;

export default function RecommendationsPage() {
    const {
        dashboardRecs,
        similarRecs,
        loadingDashboard,
        loadingSimilar,
        refreshRecommendations,
        fetchSimilarData: fetchSimilarRecs
    } = useRecommendations();

    const [watchlist, setWatchlist] = useState<Array<{ id: number; tmdb_id: number; status: string; user_rating?: number }>>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [aiRecs, setAiRecs] = useState<any[]>([]);
    const [loadingAi, setLoadingAi] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [trendingIndex, setTrendingIndex] = useState(0);

    useEffect(() => {
        fetchWatchlist();
        fetchCachedAiRecs();
    }, []);

    const fetchCachedAiRecs = async () => {
        try {
            const response = await api.get('/recommendations/ai');
            if (response.data && Array.isArray(response.data) && response.data.length > 0) {
                setAiRecs(response.data);
            }
        } catch (error) {
            // calculated silently, no error needed if cache empty
            console.log('No cached AI recs found or error');
        }
    };

    const fetchWatchlist = async () => {
        try {
            const response = await api.get('/watchlist/');
            // Map all necessary fields
            setWatchlist(response.data.map((item: any) => ({
                id: item.id, // Database ID
                tmdb_id: item.tmdb_id,
                status: item.status,
                user_rating: item.user_rating
            })));
        } catch (error) {
            console.error('Failed to fetch watchlist', error);
        }
    };

    const handleGenerateAI = async () => {
        setLoadingAi(true);
        setAiError(null);
        try {
            const response = await api.post('/recommendations/ai');
            if (response.data && Array.isArray(response.data)) {
                setAiRecs(response.data);
            } else {
                setAiError('Failed to generate recommendations.');
            }
        } catch (error) {
            console.error('AI Generation failed', error);
            setAiError('Failed to generate recommendations. Please try again.');
        } finally {
            setLoadingAi(false);
        }
    };

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
                        {trendingRecs.slice(trendingIndex, trendingIndex + TRENDING_VISIBLE).map((rec, index) => (
                            <div key={`${trendingIndex}-${index}`} className={styles.recommendationItem}>


                                <MediaCard
                                    item={{
                                        id: rec.tmdb_id || index,
                                        title: rec.items[0],
                                        overview: rec.overview || '',
                                        poster_path: rec.poster_path || '',
                                        vote_average: rec.vote_average || 0,
                                        media_type: rec.media_type || 'movie',
                                        user_rating: 0,
                                        status: 'plan_to_watch'
                                    }}
                                    showServiceBadge={rec.service_name}
                                    customBadgeColor="#db2777"
                                />
                            </div>
                        ))}
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

            {/* AI Curator Section */}
            <section className={`${styles.section} ${styles.aiSection}`}>
                <div className={styles.aiHeader}>
                    <div className={styles.aiTitleWrapper}>
                        <h2 className={styles.sectionTitle} style={{ color: '#7c3aed' }}>
                            <Sparkles className={styles.sectionIcon} /> AI Curator Picks
                        </h2>
                        <span className={styles.betaTag}>BETA</span>
                    </div>
                    <button
                        onClick={handleGenerateAI}
                        disabled={loadingAi}
                        className={styles.generateBtn}
                    >
                        {loadingAi ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
                        {loadingAi ? 'Creating...' : 'Generate New Picks'}
                    </button>
                </div>

                {/* Intro Text */}
                {aiRecs.length === 0 && !loadingAi && !aiError && (
                    <div className={styles.emptyState} style={{ background: 'transparent', padding: '1rem 0' }}>
                        <p>Our AI analyzes your taste to find hidden gems. Click Check it out!</p>
                    </div>
                )}

                {/* Error State */}
                {aiError && (
                    <div style={{ padding: '1rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '12px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <XCircle size={18} /> {aiError}
                    </div>
                )}

                {/* Loading State */}
                {loadingAi && (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#7c3aed' }}>
                        <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>Curating your personal lineup...</p>
                        <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Analyzing watch history & genres</p>
                    </div>
                )}

                {/* Results Grid */}
                {aiRecs.length > 0 && (
                    <div className={styles.aiGrid}>
                        {aiRecs.map((rec, index) => {
                            if (!rec.tmdb_id) return null; // Skip if no ID

                            const existingItem = watchlist.find(w => w.tmdb_id === rec.tmdb_id);
                            const item: MediaItem = {
                                id: rec.tmdb_id,
                                dbId: existingItem?.id,
                                title: rec.title,
                                media_type: rec.media_type || 'movie',
                                overview: rec.overview || rec.reason,
                                poster_path: rec.poster_path,
                                vote_average: rec.vote_average,
                                user_rating: existingItem?.user_rating
                            };

                            return (
                                <div key={index}>
                                    <MediaCard
                                        item={item}
                                        existingStatus={existingItem?.status}
                                        onAddSuccess={fetchWatchlist}
                                        showServiceBadge={rec.service}
                                        customBadgeColor="#7c3aed"
                                        aiReason={rec.reason}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
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
        </div>
    );
}
