'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Film, Tv, Star } from 'lucide-react';
import { PublicMediaItem } from '@/lib/publicTypes';
import PublicMediaModal from './PublicMediaModal';
import styles from './LandingSearch.module.css';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w92';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Props {
    region: string;
}

export default function LandingSearch({ region }: Props) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PublicMediaItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<PublicMediaItem | null>(null);
    const [focused, setFocused] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([]);
            return;
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(
                    `${API_BASE}/public/search?q=${encodeURIComponent(query)}&region=${region}`
                );
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                const data = await res.json();
                setResults(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("LandingSearch error querying backend API at:", `${API_BASE}/public/search`, err);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 400);
    }, [query, region]);

    const showDropdown = focused && (loading || results.length > 0 || query.length >= 2);

    return (
        <div className={styles.wrapper}>
            <div className={styles.inputRow}>
                <Search size={18} className={styles.searchIcon} />
                <input
                    ref={inputRef}
                    type="text"
                    className={styles.input}
                    placeholder="Search any show or movie..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setTimeout(() => setFocused(false), 150)}
                    autoComplete="off"
                />
                {loading && <Loader2 size={16} className={styles.spinner} />}
            </div>

            {showDropdown && (
                <div className={styles.dropdown}>
                    {loading && results.length === 0 && (
                        <div className={styles.loadingRow}>Searching...</div>
                    )}
                    {!loading && results.length === 0 && query.length >= 2 && (
                        <div className={styles.emptyRow}>No results found for "{query}"</div>
                    )}
                    {results.map(item => (
                        <button
                            key={`${item.media_type}-${item.id}`}
                            className={styles.resultRow}
                            onClick={() => { setSelected(item); setFocused(false); }}
                        >
                            {item.poster_path ? (
                                <img
                                    src={`${TMDB_IMAGE_BASE}${item.poster_path}`}
                                    alt={item.title}
                                    className={styles.thumb}
                                />
                            ) : (
                                <div className={styles.thumbFallback}>
                                    {item.media_type === 'tv' ? <Tv size={16} /> : <Film size={16} />}
                                </div>
                            )}
                            <div className={styles.resultInfo}>
                                <span className={styles.resultTitle}>{item.title}</span>
                                <div className={styles.resultMeta}>
                                    <span className={styles.resultType}>
                                        {item.media_type === 'tv' ? 'TV' : 'Movie'}
                                    </span>
                                    {item.release_date && (
                                        <span className={styles.resultYear}>
                                            {item.release_date.slice(0, 4)}
                                        </span>
                                    )}
                                    {item.vote_average ? (
                                        <span className={styles.resultRating}>
                                            <Star size={10} fill="currentColor" />
                                            {Number(item.vote_average).toFixed(1)}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                            {item.providers.length > 0 && (
                                <div className={styles.resultProviders}>
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
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {selected && (
                <PublicMediaModal item={selected} onClose={() => setSelected(null)} />
            )}
        </div>
    );
}
