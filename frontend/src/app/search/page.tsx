'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import styles from './search.module.css';
import Link from 'next/link';
import MediaCard, { MediaItem } from '@/components/MediaCard';


export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<MediaItem[]>([]);
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
                        <MediaCard
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
