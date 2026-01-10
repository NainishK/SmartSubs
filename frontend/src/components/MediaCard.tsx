'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import styles from './MediaCard.module.css';
import { Trash2, Plus, Check, Star, Tv, Film, Sparkles, ChevronDown, Calendar } from 'lucide-react';
import StarRating from './StarRating';
import MediaDetailsModal from './MediaDetailsModal';
import { GENRES } from '@/lib/genres';

export interface MediaItem {
    id: number; // TMDB ID (usually)
    dbId?: number; // Database ID (if known)
    title?: string;
    name?: string;
    media_type: string;
    overview: string;
    poster_path?: string;
    vote_average?: number;
    genre_ids?: number[]; // From Search
    user_rating?: number; // From DB (Watchlist)
    status?: string; // Watchlist status
    available_on?: string; // Enriched provider badge
    added_at?: string; // Creation date
}

interface MediaCardProps {
    item: MediaItem;
    existingStatus?: string;
    onAddSuccess?: () => void;
    showServiceBadge?: string;
    onRemove?: () => void;
    onStatusChange?: (newStatus: string, newRating?: number) => void;
    hideOverview?: boolean;
    customBadgeColor?: string;
    aiReason?: string;
    layout?: 'grid' | 'list';
}

export default function MediaCard({
    item,
    existingStatus,
    onAddSuccess,
    showServiceBadge,
    onRemove,
    onStatusChange,
    hideOverview,
    customBadgeColor,
    aiReason,
    layout = 'grid'
}: MediaCardProps) {
    const [status, setStatus] = useState(existingStatus || 'plan_to_watch');
    const [userRating, setUserRating] = useState(item.user_rating || 0);
    const [dbId, setDbId] = useState<number | undefined>(item.dbId);
    const [adding, setAdding] = useState(false);
    const [added, setAdded] = useState(false);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        setStatus(existingStatus || 'plan_to_watch');
        setUserRating(item.user_rating || 0);
        setDbId(item.dbId);
    }, [existingStatus, item.user_rating, item.dbId]);

    const addToWatchlist = async (statusOverride?: string) => {
        setAdding(true);
        setError('');
        try {
            const response = await api.post('/watchlist/', {
                tmdb_id: item.id,
                title: item.title || item.name || 'Unknown',
                media_type: item.media_type,
                poster_path: item.poster_path,
                vote_average: item.vote_average,
                overview: item.overview,
                status: statusOverride || status,
                genre_ids: item.genre_ids
            });
            setDbId(response.data.id); // Capture DB ID
            setAdded(true);
            onAddSuccess?.();
            setTimeout(() => setAdded(false), 3000);
        } catch (error: any) {
            console.error('Failed to add to watchlist', error);
            if (error.response?.status === 401) {
                setError('Please log in');
            } else {
                setError('Failed to add');
            }
        } finally {
            setAdding(false);
        }
    };

    const handleRate = async (rating: number) => {
        if (!dbId) {
            setError("Cannot rate: Item ID missing");
            return;
        }

        // Optimistic update
        setUserRating(rating);
        try {
            await api.put(`/watchlist/${dbId}/rating`, { rating });
            onStatusChange?.(status, rating);
        } catch (e) {
            console.error("Rate failed", e);
            setError("Failed to save rating");
        }
    };

    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        setStatus(newStatus);

        if (dbId) {
            try {
                await api.put(`/watchlist/${dbId}/status?status=${newStatus}`);
                onStatusChange?.(newStatus);
            } catch (err) {
                console.error("Failed to update status", err);
                // Revert? For now just log
            }
        } else {
            // Item not in watchlist? Add it with this status
            await addToWatchlist(newStatus);
        }
    };

    const tmdbLink = `https://www.themoviedb.org/${item.media_type}/${item.id}`;
    const posterUrl = item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : null;

    // Toggle state for AI Reason vs Plot
    const [showPlot, setShowPlot] = useState(false);

    // Determine what text to show in the body
    const isAiMode = aiReason && !showPlot;
    const displayText = isAiMode
        ? `"${aiReason}"`
        : item.overview
            ? (item.overview.length > 150 ? `${item.overview.substring(0, 150)}...` : item.overview)
            : 'No synopsis available.';

    const isList = layout === 'list';

    // Metadata Logic
    const genreNames = item.genre_ids
        ?.map(id => GENRES[id])
        .filter(Boolean)
        .slice(0, 3) // Show max 3 genres
        .join(', ');

    const formattedDate = item.added_at
        ? new Date(item.added_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
        : null;

    return (
        <>
            <div className={`${styles.card} ${isList ? styles.cardList : ''}`}>
                {/* Poster Section (Image First) */}
                <div
                    className={styles.posterContainer}
                    onClick={() => setShowModal(true)}
                    style={{ cursor: 'pointer' }}
                >
                    {posterUrl ? (
                        <img src={posterUrl} alt={item.title || item.name} className={styles.posterImage} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                            <Film size={32} strokeWidth={1.5} />
                        </div>
                    )}

                    {/* Overlays */}
                    <div className={styles.posterOverlay}>
                        {/* Add rating interaction here in future? For now, just visual */}
                    </div>

                    <div className={styles.topBadges}>
                        <span className={`${styles.typeBadge} ${item.media_type === 'tv' ? styles.typeTv : styles.typeMovie}`}>
                            {item.media_type === 'tv' ? <Tv size={12} /> : <Film size={12} />}
                            {item.media_type === 'tv' ? 'TV' : 'Movie'}
                        </span>
                    </div>

                    {item.vote_average && (
                        <span className={styles.ratingBadge}>
                            <Star size={12} fill="currentColor" />
                            {item.vote_average.toFixed(1)}
                        </span>
                    )}

                    {showServiceBadge && (
                        <div className={styles.serviceBadge}>
                            <Check size={12} /> {showServiceBadge}
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <div className={styles.content}>
                    <div className={styles.detailsColumn}>
                        <h3
                            className={styles.title}
                            onClick={() => setShowModal(true)}
                            style={{ cursor: 'pointer' }}
                        >
                            {item.title || item.name}
                        </h3>

                        {/* Rating UI - Now visible in List View too */}
                        {(existingStatus && status !== 'plan_to_watch') && (
                            <div style={{ marginBottom: '0.75rem' }}>
                                <StarRating rating={userRating} onRatingChange={handleRate} />
                            </div>
                        )}

                        {/* NEW: Metadata Row (Visible in List View) */}
                        <div className={styles.metaRow}>
                            {genreNames && <span className={styles.metaGenre}>{genreNames}</span>}
                            {genreNames && formattedDate && <span className={styles.metaDivider}>•</span>}
                            {formattedDate && (
                                <span className={styles.metaDate}>
                                    <Calendar size={12} style={{ marginRight: 4 }} />
                                    Added {formattedDate}
                                </span>
                            )}
                            {(showServiceBadge && isList) && (
                                <>
                                    <span className={styles.metaDivider}>•</span>
                                    <span className={styles.metaProvider}>
                                        <Tv size={12} style={{ marginRight: 4 }} /> {showServiceBadge}
                                    </span>
                                </>
                            )}
                        </div>

                        {!hideOverview && (
                            <>
                                <p
                                    className={`${styles.overview} ${isAiMode ? styles.aiOverview : ''}`}
                                    onClick={() => setShowModal(true)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {isAiMode && <Sparkles size={14} style={{ marginRight: 6, display: 'inline', verticalAlign: 'middle' }} />}
                                    {displayText}
                                </p>

                                {aiReason && (
                                    <button className={styles.toggleBtn} onClick={(e) => { e.preventDefault(); setShowPlot(!showPlot); }}>
                                        {showPlot ? <><Sparkles size={12} /> Show AI Insight</> : "Show Plot Summary"}
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {/* Actions */}
                    <div className={styles.actions}>
                        <div className={styles.statusSelectWrapper}>
                            <select
                                value={status}
                                onChange={handleStatusChange}
                                className={styles.statusSelect}
                                disabled={added || (existingStatus !== undefined && !onStatusChange)}
                            >
                                <option value="plan_to_watch">Plan to Watch</option>
                                <option value="watching">Watching</option>
                                <option value="paused">Paused</option>
                                <option value="dropped">Dropped</option>
                                <option value="watched">Watched</option>
                            </select>
                            <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6b7280' }} />
                        </div>

                        {onRemove ? (
                            <button
                                onClick={onRemove}
                                className={`${styles.actionBtn} ${styles.btnRemove}`}
                                title="Remove from Watchlist"
                            >
                                <Trash2 size={16} />
                            </button>
                        ) : (
                            <button
                                onClick={() => addToWatchlist()}
                                className={`${styles.actionBtn} ${styles.btnPrimary}`}
                                disabled={adding || added || existingStatus !== undefined}
                            >
                                {existingStatus ? <Check size={16} /> : added ? <Check size={16} /> : <Plus size={16} />}
                                {(!existingStatus && !added) && <span className={styles.btnText}>Add</span>}
                            </button>
                        )}
                    </div>
                    {error && <p className={styles.errorText}>{error}</p>}
                </div>
            </div>

            <MediaDetailsModal
                visible={showModal}
                onClose={() => setShowModal(false)}
                mediaType={item.media_type}
                tmdbId={item.id}
                initialData={{
                    title: item.title || item.name || '',
                    poster_path: item.poster_path,
                    overview: item.overview,
                    vote_average: item.vote_average
                }}
                addedAt={item.added_at}
                userRating={userRating}
                onRate={handleRate}
            />
        </>
    );
}
