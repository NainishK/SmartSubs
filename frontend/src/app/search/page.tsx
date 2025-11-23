'use client';

import { useState } from 'react';
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

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query) return;
        setLoading(true);
        try {
            const response = await api.get(`/search?query=${query}`);
            setResults(response.data.results);
        } catch (error) {
            console.error('Search failed', error);
        } finally {
            setLoading(false);
        }
    };

    const addToWatchlist = async (item: SearchResult) => {
        try {
            await api.post('/watchlist/', {
                tmdb_id: item.id,
                title: item.title || item.name || 'Unknown',
                media_type: item.media_type,
                poster_path: item.poster_path
            });
            alert('Added to watchlist!');
        } catch (error) {
            console.error('Failed to add to watchlist', error);
            alert('Failed to add to watchlist');
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Search Movies & TV</h1>
                <Link href="/dashboard" className={styles.link}>Back to Dashboard</Link>
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

            <div className={styles.grid}>
                {results.map((item) => (
                    <div key={item.id} className={styles.card}>
                        <h3>{item.title || item.name}</h3>
                        <p className={styles.type}>{item.media_type}</p>
                        <p className={styles.overview}>{item.overview?.substring(0, 100)}...</p>
                        <button onClick={() => addToWatchlist(item)} className={styles.addButton}>
                            Add to Watchlist
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
