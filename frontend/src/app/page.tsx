'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Wallet, TrendingUp, Sparkles, ChevronRight } from 'lucide-react';
import FeatureCarousel from '@/components/FeatureCarousel';
import AppShowcaseStack from '@/components/landing/AppShowcaseStack';
import AuthRedirect from '@/components/AuthRedirect';
import RegionPill from '@/components/landing/RegionPill';
import TrendingShelf from '@/components/landing/TrendingShelf';
import LandingSearch from '@/components/landing/LandingSearch';
import { PublicMediaItem } from '@/lib/publicTypes';
import styles from './page.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const GENRES = [
    { label: 'All', value: '' },
    { label: 'Action', value: 'action' },
    { label: 'Drama', value: 'drama' },
    { label: 'Anime', value: 'anime' },
    { label: 'Sci-Fi', value: 'scifi' },
    { label: 'Comedy', value: 'comedy' },
    { label: 'Thriller', value: 'thriller' },
];

export default function Home() {
    const [region, setRegion] = useState('US');
    const [regionReady, setRegionReady] = useState(false);
    const [genre, setGenre] = useState('');
    const [trendingItems, setTrendingItems] = useState<PublicMediaItem[]>([]);
    const [trendingLoading, setTrendingLoading] = useState(true);

    // Feature carousel images (unchanged from current landing)
    const discoveryImages = [
        { src: '/screenshots/search.png', alt: 'Smart Search UI' },
        { src: '/screenshots/watchlist.png', alt: 'Unified Watchlist' },
        { src: '/screenshots/watchlist_item_details1.png', alt: 'Watchlist Details' },
        { src: '/screenshots/watchlist_item_details2.png', alt: 'Watchlist Details' },
        { src: '/screenshots/recommendations1.png', alt: 'Top Recommendations' },
        { src: '/screenshots/recommendations2.png', alt: 'More Recommendations' },
    ];
    const aiImages = [
        { src: '/screenshots/AI_center_profile.png', alt: 'AI Profile' },
        { src: '/screenshots/AI_center_curator_picks.png', alt: 'Curator Picks' },
        { src: '/screenshots/AI_center_smart_strategy.png', alt: 'Smart Strategy' },
    ];

    // Auto-detect region on mount
    useEffect(() => {
        const stored = localStorage.getItem('guest_region');
        if (stored) {
            setRegion(stored);
            setRegionReady(true);
            return;
        }
        fetch('https://ipinfo.io/json')
            .then(r => r.json())
            .then(data => {
                const country = data.country || 'US';
                const supported = ['IN', 'US'].includes(country) ? country : 'US';
                setRegion(supported);
                localStorage.setItem('guest_region', supported);
            })
            .catch(() => setRegion('US'))
            .finally(() => setRegionReady(true));
    }, []);

    // Fetch trending when region or genre changes
    useEffect(() => {
        if (!regionReady) return;
        setTrendingLoading(true);
        setTrendingItems([]);
        const params = new URLSearchParams({ region });
        if (genre) params.set('genre', genre);
        fetch(`${API_BASE}/public/trending?${params}`)
            .then(r => {
                if (!r.ok) {
                    throw new Error(`HTTP error! status: ${r.status}`);
                }
                return r.json();
            })
            .then(data => setTrendingItems(Array.isArray(data) ? data : []))
            .catch(err => {
                console.error("Home error fetching trending items from:", `${API_BASE}/public/trending`, err);
                setTrendingItems([]);
            })
            .finally(() => setTrendingLoading(false));
    }, [region, genre, regionReady]);

    const handleRegionChange = (newRegion: string) => {
        setRegion(newRegion);
        localStorage.setItem('guest_region', newRegion);
    };

    return (
        <main className={styles.main}>
            <AuthRedirect />

            {/* ── Navigation ── */}
            <nav className={styles.nav}>
                <div className={styles.brandContainer}>
                    <Image
                        src="/logo-dark-theme-final-v3.png"
                        alt="BingeSensei Logo"
                        width={160}
                        height={43}
                        className={styles.brandLogo}
                        style={{ objectFit: 'contain' }}
                        priority
                    />
                </div>
                <div className={styles.navCenter}>
                    <RegionPill region={region} onChange={handleRegionChange} />
                </div>
                <div className={styles.navLinks}>
                    <Link href="/login" className={styles.navLink}>Log In</Link>
                    <Link href="/signup" className={styles.loginBtn}>Get Started</Link>
                </div>
            </nav>

            {/* ── Hero ── */}
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <span className={styles.badge}>✨ Browse any show, movie, or anime - no account needed</span>
                    <h1 className={styles.title}>
                        Your subscriptions.<br />
                        <span className={styles.titleHighlight}>One unified dashboard.</span>
                    </h1>
                    <p className={styles.subtitle}>
                        Stop paying for subscriptions you've forgotten about. One dashboard
                        to track what you watch, manage what you pay, and discover what's next.
                    </p>
                    {/* Feature highlights */}
                    <div className={styles.featurePills}>
                        <span className={styles.featurePill}><Search size={14} /> Instant Search</span>
                        <span className={styles.featurePill}><Wallet size={14} /> Kill Waste</span>
                        <span className={styles.featurePill}><TrendingUp size={14} /> Track Progress</span>
                        <span className={styles.featurePill}><Sparkles size={14} /> Curated Picks</span>
                    </div>
                    <div className={styles.ctaGroup}>
                        <Link href="/signup" className={styles.primaryBtn}>
                            Get Started Free →
                        </Link>
                        <a href="#features" className={styles.secondaryBtn}>
                            See How It Works ↓
                        </a>
                    </div>
                </div>
            </section>

            {/* ── Visual Showcase (existing, unchanged) ── */}
            <section className={styles.visualSection}>
                <div className={styles.dashboardPreview}>
                    <div className={styles.browserWindow}>
                        <div className={styles.windowInner}>
                            <div className={styles.windowHeader}>
                                <div className={`${styles.windowDot} ${styles.red}`} />
                                <div className={`${styles.windowDot} ${styles.yellow}`} />
                                <div className={`${styles.windowDot} ${styles.green}`} />
                                <div className={styles.addressBar}>bingesensei.app/dashboard</div>
                            </div>
                            <div className={styles.windowContent}>
                                <Image
                                    src="/screenshots/overview.png"
                                    alt="BingeSensei Dashboard Overview"
                                    width={1200}
                                    height={800}
                                    className={styles.heroImage}
                                    priority
                                />
                            </div>
                        </div>
                        <div className={styles.floatingBadge}>
                            🚫 Stop paying for what you don't watch
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Explore Section (no login needed) ── */}
            <section className={styles.exploreSection}>
                <div className={styles.exploreInner}>
                    <div className={styles.exploreHeader}>
                        <div>
                            <h2 className={styles.exploreTitle}>Explore What's Trending</h2>
                            <p className={styles.exploreSubtitle}>
                                No account needed. Search anything - we'll show you exactly where to watch it.
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className={styles.searchRow}>
                        <LandingSearch region={region} />
                    </div>

                    {/* Genre filters */}
                    <div className={styles.genrePills}>
                        {GENRES.map(g => (
                            <button
                                key={g.value}
                                className={`${styles.genrePill} ${genre === g.value ? styles.genreActive : ''}`}
                                onClick={() => setGenre(g.value)}
                            >
                                {g.label}
                            </button>
                        ))}
                    </div>

                    {/* Trending shelf */}
                    <TrendingShelf items={trendingItems} loading={trendingLoading} />
                </div>
            </section>

            {/* ── Join CTA Banner ── */}
            <section className={styles.joinBanner}>
                <div className={styles.joinInner}>
                    <div className={styles.joinText}>
                        <h2 className={styles.joinTitle}>Your streaming life, simplified.</h2>
                        <p className={styles.joinSubtitle}>
                            Sign up to track what you watch, cut what you don't, and discover what to watch next.
                        </p>
                    </div>
                    <Link href="/signup" className={styles.joinBtn}>
                        Start for Free <ChevronRight size={18} />
                    </Link>
                </div>
            </section>

            {/* ── Feature Highlights (unchanged) ── */}
            <section id="features" className={styles.features}>
                <div className={styles.featureRow}>
                    <div className={styles.featureContent}>
                        <div className={styles.featureIcon}><Search size={32} color="#60a5fa" /></div>
                        <h3 className={styles.featureTitle}>Find It Instantly.</h3>
                        <p className={styles.featureDesc}>
                            Stop juggling apps. Search any show, movie, or anime and instantly see which of your
                            active subscriptions has it - so you never pay for a rental you already own.
                        </p>
                    </div>
                    <div className={styles.featureVisual}>
                        <FeatureCarousel items={discoveryImages} />
                    </div>
                </div>

                <div className={`${styles.featureRow} ${styles.reversed}`}>
                    <div className={styles.featureContent}>
                        <div className={styles.featureIcon}><Sparkles size={32} color="#c084fc" /></div>
                        <h3 className={styles.featureTitle}>Your Next Obsession, Curated.</h3>
                        <p className={styles.featureDesc}>
                            Find your next binge based on what you've already loved - surfaced from the
                            services you already pay for. No rabbit holes, no wasted time.
                        </p>
                    </div>
                    <div className={styles.featureVisual}>
                        <FeatureCarousel items={aiImages} reverse />
                    </div>
                </div>

                <div className={styles.featureRow}>
                    <div className={styles.featureContent}>
                        <div className={styles.featureIcon}><Wallet size={32} color="#34d399" /></div>
                        <h3 className={styles.featureTitle}>Waste Killer.</h3>
                        <p className={styles.featureDesc}>
                            Spot the subscriptions you've forgotten about. See exactly where your money
                            is going - and cut what you're not watching.
                        </p>
                    </div>
                    <div className={styles.featureVisual}>
                        <AppShowcaseStack />
                    </div>
                </div>
            </section>
        </main>
    );
}
