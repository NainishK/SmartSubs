'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import styles from './MediaCard.module.css';

export interface MediaItem {
    id: number;
    title?: string;
    name?: string;
    media_type: string;
    overview: string;
    poster_path?: string;
    vote_average?: number;
}

interface MediaCardProps {
    item: MediaItem;
    existingStatus?: string;
    onAddSuccess?: () => void;
    showServiceBadge?: string; // Optional service name to display
}

export default function MediaCard({ item, existingStatus, onAddSuccess, showServiceBadge }: MediaCardProps) {
    const [status, setStatus] = useState(existingStatus || 'plan_to_watch');
    const [adding, setAdding] = useState(false);
    const [added, setAdded] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (existingStatus) {
            setStatus(existingStatus);
        }
    }, [existingStatus]);

    const addToWatchlist = async () => {
        setAdding(true);
        setError('');
        try {
            await api.post('/watchlist/', {
                tmdb_id: item.id,
                title: item.title || item.name || 'Unknown',
                media_type: item.media_type,
                poster_path: item.poster_path,
                status: status
            });
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
                    <span className={styles.rating}>★ {item.vote_average.toFixed(1)}</span>
                )}
            </div>

            <div className={styles.meta}>
                <span className={styles.type}>{item.media_type}</span>
                {showServiceBadge && (
                    <span className={styles.serviceBadge}>{showServiceBadge}</span>
                )}
            </div>

            <p className={styles.overview}>
                {item.overview ? (
                    item.overview.length > 150 ? `${item.overview.substring(0, 150)}...` : item.overview
                ) : (
                    'No synopsis available.'
                )}
            </p>

            {existingStatus && (
                <div className={styles.alreadyAddedBadge}>
                    ★ In {getStatusLabel(existingStatus)}
                </div>
            )}

            <div className={styles.actions}>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={styles.statusSelect}
                    disabled={added || existingStatus !== undefined}
                >
                    <option value="plan_to_watch">Plan to Watch</option>
                    <option value="watching">Watching</option>
                    <option value="watched">Watched</option>
                </select>
                <button
                    onClick={addToWatchlist}
                    className={`${styles.addButton} ${added ? styles.addedButton : ''} ${existingStatus ? styles.alreadyAddedButton : ''}`}
                    disabled={adding || added || existingStatus !== undefined}
                >
                    {existingStatus ? '✓ Added' : adding ? 'Adding...' : added ? '✓ Added' : 'Add to Watchlist'}
                </button>
            </div>
            {error && <p className={styles.errorText}>{error}</p>}
        </div>
    );
}
