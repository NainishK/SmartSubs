'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Sidebar from '@/components/Sidebar';
import styles from './layout.module.css';
import { RecommendationsProvider } from '@/context/RecommendationsContext';
import { Menu } from 'lucide-react';
import ScrollToTop from '@/components/ScrollToTop';
import { useTheme } from '@/context/ThemeContext';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [country, setCountry] = useState<string | null>(null);

    const { theme } = useTheme();
    const [activeTheme, setActiveTheme] = useState<'light' | 'dark'>('dark');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (theme === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setActiveTheme(isDark ? 'dark' : 'light');
        } else {
            setActiveTheme(theme as 'light' | 'dark');
        }
    }, [theme]);

    useEffect(() => {
        const fetchCountry = async () => {
            try {
                const api = (await import('@/lib/api')).default;
                const response = await api.get('/users/me/');
                setCountry(response.data.country || 'US');
            } catch (error) {
                console.error('Failed to fetch country', error);
            }
        };
        fetchCountry();

        // Auto-collapse on mobile
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setIsCollapsed(true);
            } else {
                setIsCollapsed(false);
            }
        };

        // Initial check
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getFlag = (code: string) => {
        const flags: Record<string, string> = {
            'US': '🇺🇸', 'IN': '🇮🇳', 'GB': '🇬🇧', 'CA': '🇨🇦', 'AU': '🇦🇺'
        };
        return flags[code] || '🌍';
    };

    return (
        <div className={styles.container}>
            {/* Mobile Header */}
            <header className={styles.mobileHeader}>
                <div className={styles.mobileLeft}>
                    <button
                        className={styles.mobileMenuBtn}
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        <Menu size={24} />
                    </button>
                    <Link href="/dashboard" className={styles.mobileLogoContainer}>
                        <Image
                            src={(!mounted || activeTheme === 'dark') ? '/logo-dark-theme-final-v3.png' : '/logo-light-theme-final-v3.png'}
                            alt="BingeSensei Logo"
                            width={104}
                            height={28}
                            style={{ objectFit: 'contain' }}
                            priority
                        />
                    </Link>
                </div>

            </header>

            <Sidebar
                isCollapsed={isCollapsed}
                toggle={() => setIsCollapsed(!isCollapsed)}
                className={isCollapsed ? styles.sidebarCollapsed : styles.sidebarExpanded}
                countryCode={country}
            />

            <main
                className={`${styles.main} ${isCollapsed ? styles.mainCollapsed : styles.mainExpanded}`}
            >
                {/* Desktop Region Badge - Now in Sidebar */}
                {/* Hidden here, maintained in Mobile Header for mobile view */}

                <RecommendationsProvider>
                    {children}
                    <ScrollToTop />
                </RecommendationsProvider>
            </main>
        </div>
    );
}
