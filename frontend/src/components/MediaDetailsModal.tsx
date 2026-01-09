'use client';

import { useEffect, useState } from 'react';
import { X, Star, Calendar, Clock, Film, Tv } from 'lucide-react';
import api from '@/lib/api';
import styles from './MediaDetailsModal.module.css';

interface MediaDetailsModalProps {
    visible: boolean;
    onClose: () => void;
    mediaType: string;
    tmdbId: number;
    initialData?: {
        title: string;
        poster_path?: string;
        overview: string;
        vote_average?: number;
    };
    addedAt?: string; // Optional: Show when added to watchlist
}

interface Provider {
    provider_id: number;
    provider_name: string;
    logo_path: string;
}

interface ProvidersData {
    flatrate?: Provider[];
    rent?: Provider[];
    buy?: Provider[];
    link?: string;
}

interface MediaDetails {
    genres: { id: number; name: string }[];
    release_date?: string;
    first_air_date?: string;
    runtime?: number;
    episode_run_time?: number[];
    number_of_seasons?: number;
    tagline?: string;
}

export default function MediaDetailsModal({ visible, onClose, mediaType, tmdbId, initialData, addedAt }: MediaDetailsModalProps) {
    const [details, setDetails] = useState<MediaDetails | null>(null);
    const [providers, setProviders] = useState<ProvidersData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (visible && tmdbId) {
            setLoading(true);
            Promise.all([
                api.get(`/media/${mediaType}/${tmdbId}/details`),
                api.get(`/media/${mediaType}/${tmdbId}/providers`)
            ]).then(([detailsRes, providersRes]) => {
                setDetails(detailsRes.data);
                setProviders(providersRes.data);
            }).catch(err => {
                console.error("Failed to fetch modal details", err);
            }).finally(() => {
                setLoading(false);
            });
        }
    }, [visible, mediaType, tmdbId]);

    if (!visible) return null;

    const posterUrl = initialData?.poster_path
        ? `https://image.tmdb.org/t/p/w780${initialData.poster_path}`
        : null;

    const year = details?.release_date
        ? new Date(details.release_date).getFullYear()
        : details?.first_air_date
            ? new Date(details.first_air_date).getFullYear()
            : 'Unknown Year';

    const getRuntime = () => {
        const time = details?.runtime || (details?.episode_run_time ? details.episode_run_time[0] : 0);
        if (!time) return null;
        const hours = Math.floor(time / 60);
        const minutes = time % 60;
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    const formattedAddedDate = addedAt
        ? new Date(addedAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        : null;

    // Combine all providers for simple display, or use just flatrate (streaming)
    const streamProviders = providers?.flatrate || [];

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className={styles.overlay} onClick={handleBackdropClick}>
            <div className={styles.modal}>
                <button className={styles.closeButton} onClick={onClose}>
                    <X size={20} />
                </button>

                <div className={styles.content}>
                    {/* Poster Side */}
                    <div className={styles.posterSide}>
                        {posterUrl ? (
                            <img src={posterUrl} alt={initialData?.title} className={styles.posterImage} />
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
                                No Poster
                            </div>
                        )}
                    </div>

                    {/* Info Side */}
                    <div className={styles.infoSide}>
                        <div className={styles.header}>
                            <h2 className={styles.title}>{initialData?.title}</h2>
                            {details?.tagline && <p style={{ fontStyle: 'italic', color: '#666', marginTop: 4 }}>{details.tagline}</p>}
                        </div>

                        <div className={styles.metaRow}>
                            <span className={styles.year}>{year}</span>
                            <span className={styles.dot}></span>
                            <span className={styles.rating}>
                                <Star size={14} fill="currentColor" /> {initialData?.vote_average?.toFixed(1) || 'N/A'}
                            </span>

                            {/* Added Date (Watchlist Context) */}
                            {formattedAddedDate && (
                                <>
                                    <span className={styles.dot}></span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6b7280', fontSize: '0.85rem' }}>
                                        <Calendar size={14} /> Added {formattedAddedDate}
                                    </span>
                                </>
                            )}

                            {getRuntime() && (
                                <>
                                    <span className={styles.dot}></span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Clock size={14} /> {getRuntime()}
                                    </span>
                                </>
                            )}
                            <span className={styles.dot}></span>
                            <span style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800 }}>
                                {mediaType === 'tv' ? 'TV Series' : 'Movie'}
                            </span>
                        </div>

                        <div className={styles.genres} style={{ marginBottom: '1.5rem' }}>
                            {details?.genres?.map(g => (
                                <span key={g.id} className={styles.genreTag}>{g.name}</span>
                            ))}
                        </div>

                        <div className={styles.sectionTitle}>SYNOPSIS</div>
                        <p className={styles.synopsis}>
                            {initialData?.overview || "No synopsis available."}
                        </p>

                        <div className={styles.providersSection}>
                            <div className={styles.sectionTitle}>WHERE TO WATCH (STREAMING)</div>
                            {loading ? (
                                <p style={{ color: '#666', fontSize: '0.9rem' }}>Checking availability...</p>
                            ) : streamProviders.length > 0 ? (
                                <div className={styles.providersList}>
                                    {streamProviders.map(p => (
                                        <div key={p.provider_id} className={styles.provider}>
                                            <img
                                                src={`https://image.tmdb.org/t/p/original${p.logo_path}`}
                                                alt={p.provider_name}
                                                className={styles.providerLogo}
                                                title={p.provider_name}
                                            />
                                            <span className={styles.providerName}>{p.provider_name}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className={styles.noProviders}>
                                    Currently not available for streaming in your region.
                                    {providers?.link && <a href={providers.link} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 6, color: '#0070f3' }}>Check options</a>}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
