'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import styles from '../dashboard.module.css';
import Link from 'next/link';
import { WatchlistItem } from '@/lib/types';

export default function WatchlistPage() {
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWatchlist();
    }, []);

    const fetchWatchlist = async () => {
        try {
            const response = await api.get('/watchlist/');
            setWatchlist(response.data);
        } catch (error) {
            console.error('Failed to fetch watchlist', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteWatchlist = async (id: number) => {
        try {
            await api.delete(`/watchlist/${id}`);
            fetchWatchlist();
        } catch (error) {
            console.error('Failed to delete watchlist item', error);
        }
    };

    const handleStatusChange = async (id: number, newStatus: string) => {
        try {
            await api.put(`/watchlist/${id}/status?status=${newStatus}`);
            fetchWatchlist();
        } catch (error) {
            console.error('Failed to update status', error);
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

    // Group watchlist by status
    const planToWatch = watchlist.filter(item => item.status === 'plan_to_watch');
    const watching = watchlist.filter(item => item.status === 'watching');
    const watched = watchlist.filter(item => item.status === 'watched');

    const renderGroup = (title: string, items: WatchlistItem[]) => {
        if (items.length === 0) return null;

        return (
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#333' }}>{title}</h3>
                <ul className={styles.list}>
                    {items.map((item) => (
                        <li key={item.id} className={styles.listItem}>
                            <div className={styles.subInfo}>
                                <h3>{item.title}</h3>
                                <p>{item.media_type}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <select
                                    value={item.status}
                                    onChange={(e) => handleStatusChange(item.id, e.target.value)}
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: '4px',
                                        border: '1px solid #ddd',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    <option value="plan_to_watch">Plan to Watch</option>
                                    <option value="watching">Watching</option>
                                    <option value="watched">Watched</option>
                                </select>
                                <button onClick={() => handleDeleteWatchlist(item.id)} className={styles.deleteBtn}>Remove</button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    if (loading) return <div className={styles.loading}>Loading...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.pageTitle}>My Watchlist</h1>
                <Link href="/search" className={styles.button}>
                    + Add Movies/TV
                </Link>
            </div>

            <div className={styles.content}>
                <div className={styles.leftColumn} style={{ width: '100%' }}>
                    <section className={styles.listSection}>
                        {watchlist.length === 0 ? (
                            <p style={{ color: '#666', fontStyle: 'italic', padding: '1rem' }}>
                                Your watchlist is empty. Go add some movies!
                            </p>
                        ) : (
                            <>
                                {renderGroup('📺 Currently Watching', watching)}
                                {renderGroup('📝 Plan to Watch', planToWatch)}
                                {renderGroup('✅ Watched', watched)}
                            </>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
