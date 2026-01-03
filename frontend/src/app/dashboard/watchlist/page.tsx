'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import MediaCard, { MediaItem } from '@/components/MediaCard';
import ConfirmationModal from '@/components/ConfirmationModal';
import AddMediaModal from '@/components/AddMediaModal';
import { Plus, Search, Loader2, Clapperboard, CalendarClock, CheckCircle, LayoutGrid, List } from 'lucide-react';
import styles from './watchlist.module.css';

export default function WatchlistPage() {
    const router = useRouter();
    const [items, setItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('watching');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isMobile, setIsMobile] = useState(false);

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [itemToRemove, setItemToRemove] = useState<MediaItem | null>(null);

    useEffect(() => {
        fetchWatchlist();
    }, []);

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);

            // Only auto-switch if no user preference is saved
            const savedMode = localStorage.getItem('watchlist_view_mode');
            if (savedMode) {
                setViewMode(savedMode as 'grid' | 'list');
            } else {
                setViewMode(mobile ? 'list' : 'grid');
            }
        };

        checkMobile();
        // We only want to listen to resize for updating isMobile state, 
        // but maybe we SHOULD NOT auto-switch viewMode on resize if user has set a preference?
        // Let's just keep checkMobile simplistic for now:
        // If window resizes, we might want to respect preference over screen size.

        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleViewChange = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        localStorage.setItem('watchlist_view_mode', mode);
    };

    const fetchWatchlist = async (isBackground = false) => {
        try {
            if (!isBackground) setLoading(true);
            const response = await api.get('/watchlist/');
            // Transform DB items
            const transformed = response.data.map((item: any) => ({
                id: item.tmdb_id,
                dbId: item.id,
                title: item.title,
                name: item.title,
                media_type: item.media_type,
                poster_path: item.poster_path,
                vote_average: item.vote_average,
                overview: item.overview,
                user_rating: item.user_rating,
                status: item.status,
                available_on: undefined // Start clear
            }));

            setItems(transformed);
            if (!isBackground) setLoading(false); // Only toggle if we touched it

            // 2. Fetch badges in background
            const ids = transformed.map((i: any) => i.id);
            if (ids.length > 0) {
                api.post('/watchlist/availability', ids).then(res => {
                    const map = res.data;
                    console.log("DEBUG: Availability Map Recv:", map); // <--- Added Log
                    setItems(prev => prev.map(p => ({
                        ...p,
                        available_on: map[p.id] || map[String(p.id)] || undefined
                    })));
                }).catch(err => console.error("Badge fetch error:", err));
            }

        } catch (error) {
            console.error('Failed to fetch watchlist', error);
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
                <div className={styles.headerActions}>
                    <div className={styles.viewToggle}>
                        <button
                            className={`${styles.toggleBtn} ${viewMode === 'grid' ? styles.activeToggle : ''}`}
                            onClick={() => handleViewChange('grid')}
                            title="Grid View"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.activeToggle : ''}`}
                            onClick={() => handleViewChange('list')}
                            title="List View"
                        >
                            <List size={18} />
                        </button>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className={styles.addButton}
                    >
                        <Plus size={20} /> Add New
                    </button>
                </div>
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
                <div className={viewMode === 'grid' ? styles.watchlistGrid : styles.watchlistList}>
                    {filteredItems.map(item => (
                        <MediaCard
                            key={item.dbId}
                            item={item}
                            existingStatus={item.status}
                            showServiceBadge={item.available_on}
                            layout={viewMode}
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
                onClose={() => setItemToRemove(null)}
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
                onAddSuccess={() => fetchWatchlist(true)} // Background refresh
                existingIds={new Set(items.map(item => item.id))}
            />
        </div>
    );
}
