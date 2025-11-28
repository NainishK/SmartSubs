'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import styles from './search.module.css';
import Link from 'next/link';

interface SearchResult {
    id: number;
    title?: string;
    name?: string;
    media_type: string;
    overview: string;
    poster_path?: string;
}

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [watchlist, setWatchlist] = useState<Array<{ tmdb_id: number; status: string }>>([]);

    useEffect(() => {
        // Fetch watchlist on mount to check which items are already added
        const fetchWatchlist = async () => {
            try {
                const response = await api.get('/watchlist/');
                setWatchlist(response.data.map((item: any) => ({ tmdb_id: item.tmdb_id, status: item.status })));
            } catch (error) {
                console.error('Failed to fetch watchlist', error);
            }
        };
        fetchWatchlist();
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query) return;
        setLoading(true);
        setSearchError('');
        try {
            const response = await api.get(`/search?query=${query}`);
            setResults(response.data.results);
            if (response.data.results.length === 0) {
                setSearchError('No results found. The TMDB API might be unavailable - please try again in a moment.');
            }
        } catch (error: any) {
            console.error('Search failed', error);
            if (error.response?.status === 401) {
                setSearchError('Please log in to search');
            } else {
                setSearchError('Search failed. Please try again or check your connection.');
            }
        } finally {
            setLoading(false);
        }
    };

    const refreshWatchlist = async () => {
        try {
            const response = await api.get('/watchlist/');
            setWatchlist(response.data.map((item: any) => ({ tmdb_id: item.tmdb_id, status: item.status })));
        } catch (error) {
            console.error('Failed to refresh watchlist', error);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Search Movies & TV</h1>
                <Link href="/dashboard/watchlist" className={styles.link}>Back to Watchlist</Link>
            </header>

            <form onSubmit={handleSearch} className={styles.form}>
                <input
                    type="text"
                    placeholder="Search for movies or TV shows..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={styles.input}
                />
                <button type="submit" className={styles.button}>Search</button>
            </form>

            {loading && <p>Loading...</p>}
            {searchError && <p style={{ color: '#dc3545', textAlign: 'center', margin: '1rem 0' }}>{searchError}</p>}

            <div className={styles.grid}>
                {results.map((item) => {
                    const existingItem = watchlist.find(w => w.tmdb_id === item.id);
                    return (
                        <SearchResultCard
                            key={item.id}
                            item={item}
                            existingStatus={existingItem?.status}
                            onAddSuccess={refreshWatchlist}
                        />
                    );
                })}
            </div>
        </div>
    );
}

interface SearchResultCardProps {
    item: SearchResult;
    existingStatus?: string;
    onAddSuccess?: () => void;
}

function SearchResultCard({ item, existingStatus, onAddSuccess }: SearchResultCardProps) {
    const [status, setStatus] = useState(existingStatus || 'plan_to_watch');
    const [adding, setAdding] = useState(false);
    const [added, setAdded] = useState(false);
    const [error, setError] = useState('');

    // Update status when existingStatus changes
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
            onAddSuccess?.(); // Refresh watchlist
            setTimeout(() => setAdded(false), 3000); // Reset after 3 seconds
        } catch (error: any) {
            console.error('Failed to add to watchlist', error);
            if (error.response?.status === 401) {
                setError('Please log in to add items');
            } else {
                setError('Failed to add - item may already exist');
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

    return (
        <div className={styles.card}>
            <h3>{item.title || item.name}</h3>
            <p className={styles.type}>{item.media_type}</p>
            <p className={styles.overview}>{item.overview?.substring(0, 100)}...</p>

            {existingStatus && (
                <div className={styles.alreadyAddedBadge}>
                    ★ Already in {getStatusLabel(existingStatus)}
                </div>
            )}

            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                    {existingStatus ? '✓ Already Added' : adding ? 'Adding...' : added ? `✓ Added to ${getStatusLabel(status)}` : 'Add to Watchlist'}
                </button>
                {error && <p className={styles.errorText}>{error}</p>}
            </div>
        </div>
    );
}
