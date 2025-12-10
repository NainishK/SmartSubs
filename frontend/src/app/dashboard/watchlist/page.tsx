'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import styles from '../dashboard.module.css';
import { WatchlistItem } from '@/lib/types';
import MediaCard from '@/components/MediaCard';
import Link from 'next/link';

export default function WatchlistPage() {
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('watching');

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
        if (!confirm('Are you sure you want to remove this from your watchlist?')) return;
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

    const filteredItems = watchlist.filter(item => item.status === activeTab);

    if (loading) return <div className={styles.loading}>Loading...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>My Watchlist</h1>
                <Link href="/search" className={styles.button} style={{ textDecoration: 'none' }}>
                    + Add New
                </Link>
            </div>

            <div style={{ marginBottom: '2rem', borderBottom: '1px solid #eaeaea' }}>
                <div style={{ display: 'flex', gap: '2rem' }}>
                    {['watching', 'plan_to_watch', 'watched'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '1rem 0',
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === tab ? '2px solid #0070f3' : '2px solid transparent',
                                color: activeTab === tab ? '#0070f3' : '#666',
                                fontWeight: activeTab === tab ? 'bold' : 'normal',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                textTransform: 'capitalize'
                            }}
                        >
                            {tab.replace(/_/g, ' ')} ({watchlist.filter(i => i.status === tab).length})
                        </button>
                    ))}
                </div>
            </div>

            {filteredItems.length > 0 ? (
                <div className={styles.recGrid}>
                    {filteredItems.map((item) => (
                        <MediaCard
                            key={item.id}
                            item={{
                                id: item.tmdb_id,
                                dbId: item.id, // Pass DB ID
                                title: item.title,
                                media_type: item.media_type,
                                overview: item.overview || '',
                                poster_path: item.poster_path,
                                vote_average: item.vote_average,
                                user_rating: item.user_rating // Pass User Rating
                            }}
                            existingStatus={item.status}
                            onRemove={() => handleDeleteWatchlist(item.id)}
                            onStatusChange={(newStatus) => handleStatusChange(item.id, newStatus)}
                            hideOverview={true}
                        />
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
                    <p>No items in this list yet. <Link href="/search" style={{ color: '#0070f3' }}>Search for something to add!</Link></p>
                </div>
            )}
        </div>
    );
}
