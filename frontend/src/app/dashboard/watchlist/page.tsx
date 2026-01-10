'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import MediaCard, { MediaItem } from '@/components/MediaCard';
import ConfirmationModal from '@/components/ConfirmationModal';
import AddMediaModal from '@/components/AddMediaModal';
import { Plus, Search, Clapperboard, CalendarClock, CheckCircle, LayoutGrid, List, Layers, ArrowUp, ArrowDown, PauseCircle, XCircle, SlidersHorizontal, ChevronDown } from 'lucide-react';
import styles from './watchlist.module.css';
import GenreFilter from './GenreFilter';

export default function WatchlistPage() {
    const router = useRouter();
    const [items, setItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // Default to 'all'
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isMobile, setIsMobile] = useState(false);

    // New Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
    const [providerFilter, setProviderFilter] = useState<string>('all'); // New Provider Filter
    const [selectedGenres, setSelectedGenres] = useState<number[]>([]); // New Genre State
    const [sortField, setSortField] = useState<'date_added' | 'rating' | 'title'>('date_added');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [showMobileFilters, setShowMobileFilters] = useState(false); // Mobile Filter Toggle
    const [showBackToTop, setShowBackToTop] = useState(false); // Scroll to top visibility
    const [isDropdownOpen, setIsDropdownOpen] = useState(false); // Mobile Custom Dropdown Toggle

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [itemToRemove, setItemToRemove] = useState<MediaItem | null>(null);
    const [userServices, setUserServices] = useState<Set<string>>(new Set()); // Store active subscription names

    useEffect(() => {
        fetchWatchlist();
        fetchSubscriptions();
    }, []);

    const fetchSubscriptions = async () => {
        try {
            const response = await api.get('/subscriptions/');
            const serviceNames = new Set<string>(response.data.map((sub: any) => sub.service_name));
            setUserServices(serviceNames);
        } catch (error) {
            console.error('Failed to fetch subscriptions', error);
        }
    };

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
        checkMobile();
        window.addEventListener('resize', checkMobile);

        // Scroll Listener
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShowBackToTop(true);
            } else {
                setShowBackToTop(false);
            }
        };
        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('scroll', handleScroll);
        }
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
                // Parse Genre IDs (handles JSON string like "[16,35,18]" or comma-separated)
                genre_ids: (() => {
                    if (!item.genre_ids) return [];
                    if (Array.isArray(item.genre_ids)) return item.genre_ids;
                    if (typeof item.genre_ids === 'string') {
                        try {
                            const parsed = JSON.parse(item.genre_ids);
                            if (Array.isArray(parsed)) return parsed.map(Number);
                        } catch {
                            // fallback: remove brackets and split
                        }
                        return item.genre_ids
                            .replace(/[\[\]]/g, '')
                            .split(',')
                            .map((s: string) => Number(s.trim()))
                            .filter((n: number) => !isNaN(n));
                    }
                    return [];
                })(),
                added_at: item.added_at, // Pass creation date
                available_on: item.available_on, // Use DB value if present
                current_season: item.current_season,
                current_episode: item.current_episode
            }));

            setItems(transformed);
            if (!isBackground) setLoading(false); // Only toggle if we touched it

            // Secondary fetch removed: relying on robust DB data from backfill
            // to avoid overwriting valid badges with incomplete availability checks.

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
                // If we are in a specific tab and move item out, it should disappear from view
                // filteredItems will handle this automatically
                return { ...item, status: newStatus, user_rating: newRating ?? item.user_rating };
            }
            return item;
        }));
    };

    const toggleSortOrder = () => {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    };

    // Filter Logic
    const filteredItems = items.filter(item => {
        // 1. Status Tab (Always apply first)
        if (activeTab !== 'all' && item.status !== activeTab) return false;

        // 2. Type Filter
        if (typeFilter !== 'all' && item.media_type !== typeFilter) return false;

        // 3. Genre Filter (AND Logic)
        if (selectedGenres.length > 0) {
            if (!item.genre_ids || item.genre_ids.length === 0) return false; // No genres = exclude
            // Must have ALL selected genres
            const hasAll = selectedGenres.every(id => item.genre_ids!.includes(id));
            if (!hasAll) return false;
        }

        // 4. Provider Filter
        if (providerFilter !== 'all') {
            if (providerFilter === 'available') {
                if (!item.available_on) return false; // Must have SOME provider
            } else if (providerFilter === 'unavailable') {
                if (item.available_on) return false; // Must NOT have a provider
            } else {
                // Specific provider map
                if (item.available_on !== providerFilter) return false;
            }
        }

        // 5. Search Query
        const trimmedQuery = searchQuery.trim().toLowerCase();
        if (trimmedQuery) {
            return (item.title || item.name || '').toLowerCase().includes(trimmedQuery);
        }

        return true;
    }).sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
            case 'rating':
                comparison = (a.vote_average || 0) - (b.vote_average || 0);
                break;
            case 'title':
                comparison = (a.title || a.name || '').localeCompare(b.title || b.name || '');
                break;
            case 'date_added':
            default:
                // Assuming ID is proxy for date added (higher = newer)
                comparison = (a.dbId || 0) - (b.dbId || 0);
                break;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
    });

    const getTabCount = (status: string) => {
        // Basic counts (ignoring other filters for context)
        if (status === 'all') return items.length;
        return items.filter(i => i.status === status).length;
    };

    const tabs = [
        { id: 'all', label: 'All', icon: <Layers size={16} /> },
        { id: 'watching', label: 'Watching', icon: <Clapperboard size={16} /> },
        { id: 'plan_to_watch', label: 'Plan to Watch', icon: <CalendarClock size={16} /> },
        { id: 'watched', label: 'Watched', icon: <CheckCircle size={16} /> },
        { id: 'paused', label: 'Paused', icon: <PauseCircle size={16} /> },
        { id: 'dropped', label: 'Dropped', icon: <XCircle size={16} /> }
    ];



    if (loading) return <div className={styles.loading}>Loading your watchlist...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.pageTitle}>My Watchlist</h1>
                    <p className={styles.subtitle}>Track what you're watching and discover new favorites.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className={styles.addButton}
                >
                    <Plus size={20} /> Add New
                </button>
            </div>

            {/* Navigation Tabs */}
            {/* Navigation Tabs (Desktop) & Dropdown (Mobile) */}
            <div className={styles.navBar}>
                {/* Mobile Custom Dropdown - REPLACES <select> */}
                {isMobile ? (
                    <div className={styles.customDropdownContainer}>
                        <button
                            className={`${styles.dropdownTrigger} ${isDropdownOpen ? styles.dropdownTriggerOpen : ''}`}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <span className={styles.triggerContent}>
                                {tabs.find(t => t.id === activeTab)?.icon}
                                {tabs.find(t => t.id === activeTab)?.label}
                                <span className={styles.triggerCount}>({getTabCount(activeTab)})</span>
                            </span>
                            <ChevronDown size={18} className={styles.triggerChevron} />
                        </button>

                        {isDropdownOpen && (
                            <div className={styles.dropdownMenu}>
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        className={`${styles.dropdownItem} ${activeTab === tab.id ? styles.dropdownItemActive : ''}`}
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            setIsDropdownOpen(false);
                                        }}
                                    >
                                        <span className={styles.tabIcon}>{tab.icon}</span>
                                        <span className={styles.itemLabel}>{tab.label}</span>
                                        <span className={styles.itemCount}>{getTabCount(tab.id)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Desktop Tabs */
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
                )}
            </div>

            {/* Command Center Toolbar */}
            <div className={styles.toolbar}>
                <div className={styles.searchContainer}>
                    <Search className={styles.searchIcon} size={18} />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>

                {isMobile && (
                    <button
                        className={`${styles.filterToggleBtn} ${showMobileFilters ? styles.filterToggleBtnActive : ''}`}
                        onClick={() => setShowMobileFilters(!showMobileFilters)}
                    >
                        <SlidersHorizontal size={18} />
                    </button>
                )}

                <div className={`${styles.controls} ${isMobile && !showMobileFilters ? styles.controlsHidden : (isMobile ? styles.controlsExpanded : '')}`}>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as any)}
                        className={styles.controlSelect}
                        style={{ minWidth: '120px' }}
                    >
                        <option value="all">All Types</option>
                        <option value="movie">Movies</option>
                        <option value="tv">TV Shows</option>
                    </select>

                    <select
                        value={providerFilter}
                        onChange={(e) => setProviderFilter(e.target.value)}
                        className={styles.controlSelect}
                        style={{ minWidth: '140px' }}
                    >
                        <option value="all">All Availability</option>
                        <option value="available">Available Now (Any)</option>
                        <option value="unavailable">Not on My Services</option>
                        {Array.from(new Set(items.map(i => i.available_on).filter(Boolean))).sort().map(p => (
                            <option key={p} value={p!}>{p}</option>
                        ))}
                    </select>

                    <GenreFilter
                        selectedIds={selectedGenres}
                        onChange={setSelectedGenres}
                    />

                    <div className={styles.sortGroup}>
                        <select
                            value={sortField}
                            onChange={(e) => setSortField(e.target.value as any)}
                            className={styles.controlSelect}
                            style={{ minWidth: '130px' }}
                        >
                            <option value="date_added">Date Added</option>
                            <option value="rating">Rating</option>
                            <option value="title">Title</option>
                        </select>
                        <button
                            className={styles.sortDirectionBtn}
                            onClick={toggleSortOrder}
                            title={sortOrder === 'asc' ? "Ascending (Oldest/Low/A-Z)" : "Descending (Newest/High/Z-A)"}
                        >
                            {sortOrder === 'asc' ?
                                <ArrowUp size={18} style={{ color: '#0070f3' }} /> :
                                <ArrowDown size={18} style={{ color: '#0070f3' }} />
                            }
                        </button>
                    </div>
                </div>

                <div className={styles.actionGroup}>
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
                </div>
            </div>

            {filteredItems.length > 0 ? (
                <div className={viewMode === 'grid' ? styles.watchlistGrid : styles.watchlistList}>
                    {filteredItems.map(item => (
                        <MediaCard
                            key={item.dbId}
                            item={item}
                            existingStatus={item.status}
                            showServiceBadge={
                                item.available_on && userServices.has(item.available_on)
                                    ? item.available_on
                                    : undefined
                            }
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

            {/* Mobile FABs */}
            <div className={styles.fabContainer}>
                {showBackToTop && (
                    <button
                        className={`${styles.fabButton} ${styles.fabSecondary}`}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                        <ArrowUp size={20} />
                    </button>
                )}
                <button className={styles.fabButton} onClick={() => setIsAddModalOpen(true)}>
                    <Plus size={24} />
                </button>
            </div>
        </div>
    );
}
