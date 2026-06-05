'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { X, Star, Film, Tv, ExternalLink } from 'lucide-react';
import { PublicMediaItem } from '@/lib/publicTypes';
import styles from './PublicMediaModal.module.css';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/';

// TMDB genre id → name
const GENRE_NAMES: Record<number, string> = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
    80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
    14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
    9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
    53: 'Thriller', 10752: 'War', 37: 'Western', 10759: 'Action & Adventure',
    10762: 'Kids', 10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy',
    10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics',
};

interface Props {
    item: PublicMediaItem;
    onClose: () => void;
}

export default function PublicMediaModal({ item, onClose }: Props) {
    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const backdropUrl = item.backdrop_path
        ? `${TMDB_IMAGE_BASE}w1280${item.backdrop_path}`
        : null;
    const posterUrl = item.poster_path
        ? `${TMDB_IMAGE_BASE}w342${item.poster_path}`
        : null;
    const rating = item.vote_average ? Number(item.vote_average).toFixed(1) : null;
    const genres = (item.genre_ids || [])
        .map(id => GENRE_NAMES[id])
        .filter(Boolean)
        .slice(0, 4);
    const year = item.release_date ? item.release_date.slice(0, 4) : null;
    const searchQuery = encodeURIComponent(`Watch ${item.title}`);

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
                    <X size={18} />
                </button>

                {/* Backdrop */}
                {backdropUrl && (
                    <div className={styles.backdrop}>
                        <img src={backdropUrl} alt="" aria-hidden />
                        <div className={styles.backdropGradient} />
                    </div>
                )}

                <div className={styles.body}>
                    {/* Poster */}
                    <div className={styles.posterCol}>
                        {posterUrl ? (
                            <img src={posterUrl} alt={item.title} className={styles.poster} />
                        ) : (
                            <div className={styles.posterFallback}>
                                {item.media_type === 'tv' ? <Tv size={40} /> : <Film size={40} />}
                            </div>
                        )}
                    </div>

                    {/* Details */}
                    <div className={styles.detailsCol}>
                        <div className={styles.metaRow}>
                            <span className={styles.typeBadge}>
                                {item.media_type === 'tv' ? 'TV Series' : 'Movie'}
                            </span>
                            {year && <span className={styles.year}>{year}</span>}
                            {rating && (
                                <span className={styles.rating}>
                                    <Star size={13} fill="currentColor" />
                                    {rating}
                                </span>
                            )}
                        </div>

                        <h2 className={styles.title}>{item.title}</h2>

                        {genres.length > 0 && (
                            <div className={styles.genres}>
                                {genres.map(g => (
                                    <span key={g} className={styles.genre}>{g}</span>
                                ))}
                            </div>
                        )}

                        {item.overview && (
                            <p className={styles.overview}>{item.overview}</p>
                        )}

                        {/* Streaming providers */}
                        {item.providers && item.providers.length > 0 && (
                            <div className={styles.providersSection}>
                                <span className={styles.providersLabel}>Available on</span>
                                <div className={styles.providers}>
                                    {item.providers.map((p, i) => (
                                        <div key={i} className={styles.providerChip}>
                                            {p.logo ? (
                                                <img
                                                    src={`${TMDB_IMAGE_BASE}w45${p.logo}`}
                                                    alt={p.name || ''}
                                                    className={styles.providerLogo}
                                                />
                                            ) : null}
                                            <span>{p.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {item.providers && item.providers.length === 0 && (
                            <p className={styles.noProviders}>
                                Not currently available for streaming in your region.
                            </p>
                        )}

                        {/* CTAs */}
                        <div className={styles.actions}>
                            <a
                                href={`https://www.google.com/search?q=${searchQuery}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.watchBtn}
                            >
                                <ExternalLink size={14} />
                                Find where to watch
                            </a>
                            <Link href="/signup" className={styles.signupBtn}>
                                Sign up to track this →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
