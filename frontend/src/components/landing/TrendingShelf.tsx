'use client';

import { useState } from 'react';
import { Star, Film, Tv } from 'lucide-react';
import { PublicMediaItem } from '@/lib/publicTypes';
import PublicMediaModal from './PublicMediaModal';
import styles from './TrendingShelf.module.css';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342';

interface Props {
    items: PublicMediaItem[];
    loading: boolean;
}

export default function TrendingShelf({ items, loading }: Props) {
    const [selected, setSelected] = useState<PublicMediaItem | null>(null);

    if (loading) {
        return (
            <div className={styles.shelf}>
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className={styles.skeleton} />
                ))}
            </div>
        );
    }

    return (
        <>
            <div className={styles.shelf}>
                {items.map(item => (
                    <button
                        key={`${item.media_type}-${item.id}`}
                        className={styles.card}
                        onClick={() => setSelected(item)}
                    >
                        {item.poster_path ? (
                            <img
                                src={`${TMDB_IMAGE_BASE}${item.poster_path}`}
                                alt={item.title}
                                className={styles.poster}
                                loading="lazy"
                            />
                        ) : (
                            <div className={styles.posterFallback}>
                                {item.media_type === 'tv' ? <Tv size={32} /> : <Film size={32} />}
                            </div>
                        )}
                        <div className={styles.cardOverlay}>
                            <div className={styles.cardMeta}>
                                <span className={styles.typeBadge}>
                                    {item.media_type === 'tv' ? 'TV' : 'Movie'}
                                </span>
                                {item.vote_average ? (
                                    <span className={styles.rating}>
                                        <Star size={10} fill="currentColor" />
                                        {Number(item.vote_average).toFixed(1)}
                                    </span>
                                ) : null}
                            </div>
                            <p className={styles.cardTitle}>{item.title}</p>
                            {item.providers.length > 0 && (
                                <div className={styles.providerBadges}>
                                    {item.providers.slice(0, 2).map((p, i) =>
                                        p.logo ? (
                                            <img
                                                key={i}
                                                src={`https://image.tmdb.org/t/p/w45${p.logo}`}
                                                alt={p.name || ''}
                                                className={styles.providerIcon}
                                                title={p.name || ''}
                                            />
                                        ) : null
                                    )}
                                    {item.providers.length > 2 && (
                                        <span className={styles.moreProviders}>
                                            +{item.providers.length - 2}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </button>
                ))}
            </div>

            {selected && (
                <PublicMediaModal item={selected} onClose={() => setSelected(null)} />
            )}
        </>
    );
}
