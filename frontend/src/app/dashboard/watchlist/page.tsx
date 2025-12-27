'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import MediaCard, { MediaItem } from '@/components/MediaCard';
import ConfirmationModal from '@/components/ConfirmationModal';
import AddMediaModal from '@/components/AddMediaModal';
import { Plus, Search, Loader2, Clapperboard, CalendarClock, CheckCircle } from 'lucide-react';
import styles from './watchlist.module.css';

export default function WatchlistPage() {
    const router = useRouter();
    const [items, setItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('watching');

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [itemToRemove, setItemToRemove] = useState<MediaItem | null>(null);

    useEffect(() => {
        fetchWatchlist();
    }, []);

    const fetchWatchlist = async () => {
        try {
            setLoading(true);
            const response = await api.get('/watchlist/');
            // Transform DB items to MediaItems if needed, or api returns compatible shape
            const transformed = response.data.map((item: any) => ({
                id: item.tmdb_id, // MediaCard expects tmdb id as id
                dbId: item.id,   // DB Primary Key for updates
                title: item.title,
                name: item.title, // Handle both
                media_type: item.media_type,
                poster_path: item.poster_path,
                vote_average: item.vote_average,
                overview: item.overview,
                user_rating: item.rating,
                status: item.status
            }));
            setItems(transformed);
        } catch (error) {
            console.error('Failed to fetch watchlist', error);
        } finally {
            setLoading(false);
        }
    };

    const confirmRemove = (item: MediaItem) => {
        setItemToRemove(item);
    };

    const handleRemove = async () => {
        if (!itemToRemove?.dbId) return;

        try {
            await api.delete(`/watchlist/${itemToRemove.dbId}`);
            setItems(prev => prev.filter(i => i.dbId !== itemToRemove.dbId));
            setItemToRemove(null);
        } catch (error) {
            console.error('Failed to delete item', error);
            alert("Failed to remove item");
        }
    };

    const handleStatusUpdate = (dbId: number, newStatus: string, newRating?: number) => {
        setItems(prev => prev.map(item => {
            if (item.dbId === dbId) {
                return { ...item, status: newStatus, user_rating: newRating ?? item.user_rating };
            }
            return item;
        }));
    };

    const filteredItems = items.filter(item => {
        if (activeTab === 'all') return true;
        return item.status === activeTab;
    });

    const getTabCount = (status: string) => {
        if (status === 'all') return items.length;
        return items.filter(i => i.status === status).length;
    };

    const tabs = [
        { id: 'watching', label: 'Watching', icon: <Clapperboard size={16} /> },
        { id: 'plan_to_watch', label: 'Plan to Watch', icon: <CalendarClock size={16} /> },
        { id: 'watched', label: 'Watched', icon: <CheckCircle size={16} /> }
    ];

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>My Watchlist</h1>
                        <div className={styles.skeletonText} style={{ width: 300, height: 20, marginTop: 8 }}></div>
                    </div>
                </div>
                <div className={styles.grid}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className={styles.skeletonCard}></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>My Watchlist</h1>
                    <p className={styles.subtitle}>Track what you're watching and discover new favorites.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className={styles.addButton}
                >
                    <Plus size={20} /> Add New
                </button>
            </div>

            <div className={styles.tabs}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span className={styles.tabIcon}>{tab.icon}</span>
                        {tab.label}
                        <span className={styles.tabCount}>{getTabCount(tab.id)}</span>
                    </button>
                ))}
            </div>

            {filteredItems.length > 0 ? (
                <div className={styles.watchlistGrid}>
                    {filteredItems.map(item => (
                        <MediaCard
                            key={item.dbId}
                            item={item}
                            existingStatus={item.status}

                            onRemove={() => confirmRemove(item)}
                            onStatusChange={(s, r) => handleStatusUpdate(item.dbId!, s, r)}
                        />
                    ))}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        {activeTab === 'watching' ? <Clapperboard size={32} /> :
                            activeTab === 'plan_to_watch' ? <CalendarClock size={32} /> :
                                <CheckCircle size={32} />}
                    </div>
                    <h3 className={styles.emptyTitle}>
                        {activeTab === 'watching' ? 'No shows in progress' :
                            activeTab === 'plan_to_watch' ? 'Your list is empty' :
                                'No completed shows yet'}
                    </h3>
                    <p className={styles.emptyText}>
                        {activeTab === 'watching' ? 'Start watching something from your plan to watch list!' :
                            activeTab === 'plan_to_watch' ? 'Find movies and TV shows to add to your list.' :
                                'Mark shows as watched when you finish them.'}
                    </p>
                    <button onClick={() => setIsAddModalOpen(true)} className={styles.emptyBtn}>
                        <Search size={18} /> Browse Content
                    </button>
                </div>
            )}

            {/* Modals */}
            <ConfirmationModal
                isOpen={!!itemToRemove}
                title={`Remove ${itemToRemove?.title || itemToRemove?.name}?`}
                message={
                    <span>
                        Are you sure you want to remove <strong>{itemToRemove?.title || itemToRemove?.name}</strong> from your watchlist? This action cannot be undone.
                    </span>
                }
                confirmLabel="Yes, Remove"
                onConfirm={handleRemove}
                onCancel={() => setItemToRemove(null)}
                isDangerous={true}
            />

            <AddMediaModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAddSuccess={() => fetchWatchlist()}
                existingIds={new Set(items.map(item => item.id))}
            />
        </div>
    );
}
