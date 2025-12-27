'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search, Plus, Check, Clapperboard, CalendarClock, CheckCircle, ChevronDown } from 'lucide-react';
import api from '@/lib/api';
import styles from './AddMediaModal.module.css';

interface AddMediaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddSuccess: () => void;
    existingIds: Set<number>;
}

interface SearchResult {
    id: number;
    title?: string;
    name?: string;
    media_type: 'movie' | 'tv';
    poster_path?: string;
    release_date?: string;
    first_air_date?: string;
    vote_average?: number;
    genre_ids?: number[];
    overview?: string;
}

export default function AddMediaModal({ isOpen, onClose, onAddSuccess, existingIds }: AddMediaModalProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
    const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // Status tracking for items already in list (optional, but good for UX if we had that data)
    // For now, we assume everything is new.

    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!query.trim()) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                const response = await api.get(`/search?query=${encodeURIComponent(query)}`);
                const validResults = response.data.results
                    .filter((item: SearchResult) => item.media_type === 'movie' || item.media_type === 'tv')
                    .slice(0, 10);
                setResults(validResults);
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setLoading(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    const handleAddClick = (id: number) => {
        if (openDropdownId === id) {
            setOpenDropdownId(null);
        } else {
            setOpenDropdownId(id);
        }
    };

    const handleExpand = (id: number) => {
        setExpandedId(prev => (prev === id ? null : id));
    };

    const confirmAdd = async (item: SearchResult, status: string) => {
        try {
            await api.post('/watchlist/', {
                tmdb_id: item.id,
                title: item.title || item.name || 'Unknown',
                media_type: item.media_type,
                poster_path: item.poster_path,
                vote_average: item.vote_average,
                overview: item.overview,
                status: status,
                genre_ids: item.genre_ids
            });
            setAddedIds(prev => new Set(prev).add(item.id));
            setOpenDropdownId(null); // Close dropdown
            onAddSuccess();
        } catch (error) {
            console.error("Failed to add", error);
            alert("Failed to add to watchlist. It might already be there.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Add to Watchlist</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.searchSection}>
                    <div className={styles.inputWrapper}>
                        <Search className={styles.searchIcon} />
                        <input
                            ref={inputRef}
                            type="text"
                            className={styles.searchInput}
                            placeholder="Search for movies or TV shows..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className={styles.resultsList}>
                    {loading && <div className={styles.noResults}>Searching...</div>}

                    {!loading && query && results.length === 0 && (
                        <div className={styles.noResults}>No results found for "{query}"</div>
                    )}

                    {!loading && results.map(item => {
                        const year = (item.release_date || item.first_air_date || '').split('-')[0];
                        const isAdded = addedIds.has(item.id) || existingIds.has(item.id);
                        const isDropdownOpen = openDropdownId === item.id;
                        const isExpanded = expandedId === item.id;

                        return (
                            <div
                                key={item.id}
                                className={`${styles.resultItem} ${isDropdownOpen ? styles.resultItemActive : ''}`}
                                onClick={() => handleExpand(item.id)}
                            >
                                {/* ... existing card content ... */}
                                <div className={styles.itemMain}>
                                    {item.poster_path ? (
                                        <img
                                            src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                                            alt={item.title || item.name}
                                            className={styles.poster}
                                        />
                                    ) : (
                                        <div className={styles.poster} />
                                    )}

                                    <div className={styles.info}>
                                        <h4 className={styles.itemTitle}>{item.title || item.name}</h4>
                                        <div className={styles.itemMeta}>
                                            <span>{item.media_type === 'tv' ? 'TV Series' : 'Movie'}</span>
                                            <span>•</span>
                                            <span>{year}</span>
                                            {item.vote_average && item.vote_average > 0 && (
                                                <div className={styles.rating}>
                                                    <svg className={styles.starIcon} viewBox="0 0 24 24">
                                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                                    </svg>
                                                    {item.vote_average.toFixed(1)}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div
                                        className={styles.actions}
                                        ref={isDropdownOpen ? dropdownRef : null}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            className={styles.addButton}
                                            onClick={() => !isAdded && handleAddClick(item.id)}
                                            disabled={isAdded}
                                        >
                                            {isAdded ? (
                                                <>
                                                    <Check size={16} /> Added
                                                </>
                                            ) : (
                                                <>
                                                    <Plus size={16} /> Add
                                                    <ChevronDown size={14} style={{ opacity: 0.7 }} />
                                                </>
                                            )}
                                        </button>

                                        {isDropdownOpen && (
                                            <div className={styles.dropdownMenu}>
                                                <button
                                                    className={styles.dropdownItem}
                                                    onClick={() => confirmAdd(item, 'watching')}
                                                >
                                                    <Clapperboard size={16} className="text-blue-500" />
                                                    <span className={styles.dropdownLabel}>Watching</span>
                                                </button>
                                                <button
                                                    className={styles.dropdownItem}
                                                    onClick={() => confirmAdd(item, 'plan_to_watch')}
                                                >
                                                    <CalendarClock size={16} className="text-amber-500" />
                                                    <span className={styles.dropdownLabel}>Plan to Watch</span>
                                                </button>
                                                <button
                                                    className={styles.dropdownItem}
                                                    onClick={() => confirmAdd(item, 'watched')}
                                                >
                                                    <CheckCircle size={16} className="text-green-500" />
                                                    <span className={styles.dropdownLabel}>Watched</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className={styles.details} onClick={e => e.stopPropagation()}>
                                        <div className={styles.detailsHeader}>
                                            <div className={styles.detailsText}>
                                                {item.overview || <span className={styles.detailsEmpty}>No synopsis available.</span>}
                                            </div>
                                            <a
                                                href={`https://www.google.com/search?q=${encodeURIComponent((item.title || item.name || '') + ' ' + item.media_type)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.webSearchBtn}
                                            >
                                                <Search size={14} /> Web Search
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div >
            </div >
        </div >
    );
}
