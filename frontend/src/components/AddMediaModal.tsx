import { useState, useEffect, useRef } from 'react';
import { X, Search, Plus, Check, Clapperboard, CalendarClock, CheckCircle, ChevronDown, Trash2, Star, PauseCircle, XCircle } from 'lucide-react';
import api from '@/lib/api';
import styles from './AddMediaModal.module.css';
import StarRating from './StarRating';

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

// Minimal shape for our internal tracking of existing items in this modal
interface ExistingItemState {
    id: number; // DB ID (watchlist_item.id)
    status: string;
    user_rating: number | null;
}

import ConfirmationModal from './ConfirmationModal';

export default function AddMediaModal({ isOpen, onClose, onAddSuccess, existingIds }: AddMediaModalProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    // Map TMDB_ID -> ExistingItemState
    const [existingMap, setExistingMap] = useState<Map<number, ExistingItemState>>(new Map());

    const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
    const [ratingModeId, setRatingModeId] = useState<number | null>(null); // If set, showing rating UI for this TMDB ID
    const [pendingStatus, setPendingStatus] = useState<string | null>(null); // Status selected before rating

    // Deletion State
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    const [expandedId, setExpandedId] = useState<number | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch full watchlist context on open to populate existingMap
    useEffect(() => {
        if (isOpen) {
            fetchExistingContext();
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const fetchExistingContext = async () => {
        try {
            const res = await api.get('/watchlist/?limit=1000'); // Get all
            const map = new Map<number, ExistingItemState>();
            res.data.forEach((item: any) => {
                if (item.tmdb_id) {
                    map.set(item.tmdb_id, {
                        id: item.id,
                        status: item.status,
                        user_rating: item.user_rating
                    });
                }
            });
            setExistingMap(map);
        } catch (e) {
            console.error("Failed to fetch context", e);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdownId(null);
                setRatingModeId(null);
                setPendingStatus(null);
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

    const handleDropdownToggle = (tmdbId: number) => {
        if (openDropdownId === tmdbId) {
            setOpenDropdownId(null);
            setRatingModeId(null);
        } else {
            setOpenDropdownId(tmdbId);
            setRatingModeId(null);
        }
    };

    const handleExpand = (id: number) => {
        setExpandedId(prev => (prev === id ? null : id));
    };

    const handleStatusSelect = async (item: SearchResult, status: string) => {
        // If status is 'watched' or 'watching', show rating UI first
        if (status === 'watched' || status === 'watching') {
            setPendingStatus(status);
            setRatingModeId(item.id);
            return;
        }

        // Otherwise just save immediately
        await executeSave(item, status, null);
    };

    const handleRatingSelect = async (item: SearchResult, rating: number) => {
        // We have a pending status and a new rating
        await executeSave(item, pendingStatus || 'watched', rating);
    };

    const executeSave = async (item: SearchResult, status: string, rating: number | null) => {
        const existing = existingMap.get(item.id);

        try {
            if (existing) {
                // Update Existing
                await api.put(`/watchlist/${existing.id}/status?status=${status}`);
                if (rating !== null) {
                    await api.put(`/watchlist/${existing.id}/rating`, { rating });
                }

                // Update local map
                setExistingMap(prev => new Map(prev).set(item.id, {
                    ...existing,
                    status: status,
                    user_rating: rating !== null ? rating : existing.user_rating
                }));
            } else {
                // Create New
                const res = await api.post('/watchlist/', {
                    tmdb_id: item.id,
                    title: item.title || item.name || 'Unknown',
                    media_type: item.media_type,
                    poster_path: item.poster_path,
                    vote_average: item.vote_average,
                    overview: item.overview,
                    status: status,
                    genre_ids: item.genre_ids,
                    user_rating: rating
                });

                // Update local map
                setExistingMap(prev => new Map(prev).set(item.id, {
                    id: res.data.id,
                    status: status,
                    user_rating: rating
                }));
            }

            setOpenDropdownId(null);
            setRatingModeId(null);
            onAddSuccess(); // Trigger parent refresh if needed
        } catch (error) {
            console.error("Failed to save", error);
            alert("Failed to save. check console.");
        }
    };

    const triggerDelete = (tmdbId: number) => {
        setConfirmDeleteId(tmdbId);
        setOpenDropdownId(null); // Close dropdown
    };

    const executeDelete = async () => {
        if (!confirmDeleteId) return;

        const existing = existingMap.get(confirmDeleteId);
        if (!existing) return;

        try {
            await api.delete(`/watchlist/${existing.id}`);
            const newMap = new Map(existingMap);
            newMap.delete(confirmDeleteId);
            setExistingMap(newMap);
            setConfirmDeleteId(null);
            onAddSuccess();
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    // Helpers to get status color/icon
    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'watching': return { label: 'Watching', color: '#3b82f6', icon: Clapperboard };
            case 'watched': return { label: 'Watched', color: '#10b981', icon: CheckCircle };
            case 'plan_to_watch': return { label: 'Plan to Watch', color: '#f59e0b', icon: CalendarClock };
            case 'paused': return { label: 'Paused', color: '#6b7280', icon: PauseCircle };
            case 'dropped': return { label: 'Dropped', color: '#ef4444', icon: XCircle };
            default: return { label: 'Add', color: '#2563eb', icon: Plus };
        }
    };

    if (!isOpen) return null;

    return (
        <>
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
                            const existing = existingMap.get(item.id);
                            const isDropdownOpen = openDropdownId === item.id;
                            const isExpanded = expandedId === item.id;
                            const isRatingMode = ratingModeId === item.id;

                            const statusConfig = existing ? getStatusConfig(existing.status) : getStatusConfig('new');

                            return (
                                <div
                                    key={item.id}
                                    className={`${styles.resultItem} ${isDropdownOpen ? styles.resultItemActive : ''}`}
                                    onClick={() => handleExpand(item.id)}
                                >
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
                                                        <Star size={12} fill="currentColor" />
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
                                                onClick={() => handleDropdownToggle(item.id)}
                                                style={existing ? { backgroundColor: statusConfig.color } : {}}
                                            >
                                                {existing ? (
                                                    <>
                                                        <statusConfig.icon size={16} />
                                                        {statusConfig.label}
                                                        {existing.user_rating ? ` • ★ ${existing.user_rating / 2}` : ''}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={16} /> Add
                                                    </>
                                                )}
                                                <ChevronDown size={14} style={{ opacity: 0.7 }} />
                                            </button>

                                            {isDropdownOpen && (
                                                <div className={styles.dropdownMenu}>
                                                    {isRatingMode ? (
                                                        <div className={styles.ratingContainer}>
                                                            <span className={styles.ratingLabel}>Rate this title</span>
                                                            <StarRating
                                                                rating={0}
                                                                onRatingChange={(r) => handleRatingSelect(item, r)}
                                                                size={24}
                                                            />
                                                            <button
                                                                className={styles.dropdownItem}
                                                                style={{ justifyContent: 'center', fontSize: '0.8rem', color: '#6b7280' }}
                                                                onClick={() => executeSave(item, pendingStatus || 'watched', null)}
                                                            >
                                                                Skip Rating
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <button
                                                                className={styles.dropdownItem}
                                                                onClick={() => handleStatusSelect(item, 'watching')}
                                                            >
                                                                <Clapperboard size={16} className="text-blue-500" />
                                                                <span className={styles.dropdownLabel}>Watching</span>
                                                            </button>
                                                            <button
                                                                className={styles.dropdownItem}
                                                                onClick={() => handleStatusSelect(item, 'plan_to_watch')}
                                                            >
                                                                <CalendarClock size={16} className="text-amber-500" />
                                                                <span className={styles.dropdownLabel}>Plan to Watch</span>
                                                            </button>
                                                            <button
                                                                className={styles.dropdownItem}
                                                                onClick={() => handleStatusSelect(item, 'watched')}
                                                            >
                                                                <CheckCircle size={16} className="text-green-500" />
                                                                <span className={styles.dropdownLabel}>Watched</span>
                                                            </button>
                                                            <button
                                                                className={styles.dropdownItem}
                                                                onClick={() => handleStatusSelect(item, 'paused')}
                                                            >
                                                                <PauseCircle size={16} className="text-gray-500" />
                                                                <span className={styles.dropdownLabel}>Paused</span>
                                                            </button>
                                                            <button
                                                                className={styles.dropdownItem}
                                                                onClick={() => handleStatusSelect(item, 'dropped')}
                                                            >
                                                                <XCircle size={16} className="text-red-500" />
                                                                <span className={styles.dropdownLabel}>Dropped</span>
                                                            </button>

                                                            {existing && (
                                                                <>
                                                                    <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />
                                                                    <button
                                                                        className={`${styles.dropdownItem} ${styles.deleteButton}`}
                                                                        onClick={() => triggerDelete(item.id)}
                                                                    >
                                                                        <Trash2 size={16} />
                                                                        <span className={styles.dropdownLabel}>Remove</span>
                                                                    </button>
                                                                </>
                                                            )}
                                                        </>
                                                    )}
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

            <ConfirmationModal
                isOpen={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={executeDelete}
                title="Remove from Watchlist?"
                message="Are you sure you want to remove this item? This action cannot be undone."
                confirmLabel="Remove"
                isDangerous={true}
            />
        </>
    );
}
