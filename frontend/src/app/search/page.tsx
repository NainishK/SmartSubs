'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import styles from './search.module.css';
import Link from 'next/link';
import MediaCard, { MediaItem } from '@/components/MediaCard';


export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [mediaType, setMediaType] = useState('all');
    const [results, setResults] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [watchlist, setWatchlist] = useState<Array<{ id: number; tmdb_id: number; status: string }>>([]);

    useEffect(() => {
        // Fetch watchlist on mount to check which items are already added
        const fetchWatchlist = async () => {
            try {
                const response = await api.get('/watchlist/');
                setWatchlist(response.data.map((item: any) => ({ id: item.id, tmdb_id: item.tmdb_id, status: item.status })));
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
            let filteredResults = response.data.results;

            // Filter by media type if not 'all'
            if (mediaType !== 'all') {
                filteredResults = filteredResults.filter((item: MediaItem) => item.media_type === mediaType);
            }

            // Sort by rating (vote_average) in descending order to show highly rated items first
            filteredResults.sort((a: MediaItem, b: MediaItem) => {
                const ratingA = a.vote_average || 0;
                const ratingB = b.vote_average || 0;
                return ratingB - ratingA;
            });

            setResults(filteredResults);
            if (filteredResults.length === 0) {
                setSearchError('No results found. Try a different search or filter.');
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
            setWatchlist(response.data.map((item: any) => ({ id: item.id, tmdb_id: item.tmdb_id, status: item.status })));
        } catch (error) {
            console.error('Failed to refresh watchlist', error);
        }
    };

    const handleRemove = async (watchlistId: number) => {
        if (!confirm('Remove this item from your watchlist?')) return;
        try {
            await api.delete(`/watchlist/${watchlistId}`);
            await refreshWatchlist();
        } catch (error) {
            console.error('Failed to remove from watchlist', error);
            alert('Failed to remove item');
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
                    style={{ flex: 2 }}
                />
                <select
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value)}
                    className={styles.input}
                    style={{ flex: '0 0 150px' }}
                >
                    <option value="all">All</option>
                    <option value="movie">Movies</option>
                    <option value="tv">TV Shows</option>
                </select>
                <button type="submit" className={styles.button}>Search</button>
            </form>

            {loading && <p>Loading...</p>}
            {searchError && <p style={{ color: '#dc3545', textAlign: 'center', margin: '1rem 0' }}>{searchError}</p>}

            <div className={styles.grid}>
                {results.map((item) => {
                    const existingItem = watchlist.find(w => w.tmdb_id === item.id);
                    return (
                        <MediaCard
                            key={item.id}
                            item={item}
                            existingStatus={existingItem?.status}
                            onAddSuccess={refreshWatchlist}
                            onRemove={existingItem ? () => handleRemove(existingItem.id) : undefined}
                        />
                    );
                })}
            </div>
        </div>
    );
}
