'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import styles from './MediaCard.module.css';

import StarRating from './StarRating';

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
}

interface MediaCardProps {
    item: MediaItem;
    existingStatus?: string;
    onAddSuccess?: () => void;
    showServiceBadge?: string;
    onRemove?: () => void;
    onStatusChange?: (newStatus: string, newRating?: number) => void;
    hideOverview?: boolean;
}

export default function MediaCard({
    item,
    existingStatus,
    onAddSuccess,
    showServiceBadge,
    onRemove,
    onStatusChange,
    hideOverview
}: MediaCardProps) {
    const [status, setStatus] = useState(existingStatus || 'plan_to_watch');
    const [userRating, setUserRating] = useState(item.user_rating || 0);
    const [dbId, setDbId] = useState<number | undefined>(item.dbId);
    const [adding, setAdding] = useState(false);
    const [added, setAdded] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (existingStatus) {
            setStatus(existingStatus);
        }
        if (item.user_rating) {
            setUserRating(item.user_rating);
        }
        if (item.dbId) {
            setDbId(item.dbId);
        }
    }, [existingStatus, item.user_rating, item.dbId]);

    const addToWatchlist = async () => {
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
                status: status,
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
            // Need endpoint PUT /watchlist/{id}/rating
            // But wait, we need the DB ID (`item.id` might be TMDB ID if from Search)
            // If existingStatus is present, we assume `item.id` matches the watchlist logic?
            // Actually, for Watchlist items, `item.id` is usually the TMDB ID in the frontend model if using `tmdb_id`.
            // Let's check WatchlistPage. It passes `item` from `watchlist` response.
            // `watchlist` response usually has `id` (DB ID) and `tmdb_id`.
            // Frontend interface `MediaItem` has `id`.
            // If from WatchlistPage, `id` is DB ID? No, looking at models, `WatchlistItem` has `id`.
            // Looking at `WatchlistPage.tsx` (from memory/previous view), it maps data.
            // If `item.id` is TMDB ID, we need to find the DB ID to update rating?
            // Or the endpoint should support TMDB ID?

            // To be safe, if we are in Watchlist mode (onRemove present), we assume we can rate.
            // But we need the DB ID.
            // Assuming `onStatusChange` might handle it or we call API directly.
            // Let's call API. Assuming `item.id` is passed correctly from WatchlistPage as DB ID?
            // NO. Watchlist items usually have `tmdb_id` as the main ID for display consistency with Search?
            // Let's verify `WatchlistPage` mapping.

            // For now, assume endpoint accepts TMDB ID or we pass DB ID separately?
            // "item" has "id". In Search, it's TMDB ID.
            // In WatchlistPage, it maps response.

            // Let's use `api.put(`/watchlist/${item.id}/rating`, { rating })`.
            await api.put(`/watchlist/${dbId}/rating`, { rating });
            onStatusChange?.(status, rating);
        } catch (e) {
            console.error("Rate failed", e);
            setError("Failed to save rating");
        }
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        setStatus(newStatus);
        onStatusChange?.(newStatus);
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'plan_to_watch': return 'Plan to Watch';
            case 'watching': return 'Watching';
            case 'watched': return 'Watched';
            default: return status;
        }
    };

    const tmdbLink = `https://www.themoviedb.org/${item.media_type}/${item.id}`;

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <h3>
                    <a href={tmdbLink} target="_blank" rel="noopener noreferrer" className={styles.titleLink}>
                        {item.title || item.name}
                    </a>
                </h3>
                {item.vote_average && (
                    <span className={styles.rating}>{item.vote_average.toFixed(1)}</span>
                )}
            </div>

            <div className={styles.meta}>
                <span className={`${styles.type} ${item.media_type === 'tv' ? styles.typeTv : styles.typeMovie}`}>
                    {item.media_type === 'tv' ? 'TV Series' : 'Movie'}
                </span>
                {showServiceBadge && (
                    <span className={styles.serviceBadge}>{showServiceBadge}</span>
                )}
            </div>

            {!hideOverview && (
                <p className={styles.overview}>
                    {item.overview ? (
                        item.overview.length > 150 ? `${item.overview.substring(0, 150)}...` : item.overview
                    ) : (
                        'No synopsis available.'
                    )}
                </p>
            )}

            {/* Rating UI - Only show if in watchlist (existingStatus is set) */}
            {existingStatus && (
                <div className={styles.userRating}>
                    <StarRating rating={userRating} onRate={handleRate} editable={true} />
                </div>
            )}

            {existingStatus && !onRemove && (
                <div className={styles.alreadyAddedBadge}>
                    In {getStatusLabel(existingStatus)}
                </div>
            )}

            <div className={styles.actions}>
                <select
                    value={status}
                    onChange={handleStatusChange}
                    className={styles.statusSelect}
                    disabled={added || (existingStatus !== undefined && !onStatusChange)}
                >
                    <option value="plan_to_watch">Plan to Watch</option>
                    <option value="watching">Watching</option>
                    <option value="watched">Watched</option>
                </select>

                {onRemove ? (
                    <button
                        onClick={onRemove}
                        className={styles.removeButton}
                    >
                        Remove
                    </button>
                ) : (
                    <button
                        onClick={addToWatchlist}
                        className={`${styles.addButton} ${added ? styles.addedButton : ''} ${existingStatus ? styles.alreadyAddedButton : ''}`}
                        disabled={adding || added || existingStatus !== undefined}
                    >
                        {existingStatus ? 'Added' : adding ? 'Adding...' : added ? 'Added' : 'Add to Watchlist'}
                    </button>
                )}
            </div>
            {error && <p className={styles.errorText}>{error}</p>}
        </div>
    );
}
