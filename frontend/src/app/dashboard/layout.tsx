'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import styles from './layout.module.css';
import { RecommendationsProvider } from '@/context/RecommendationsContext';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [country, setCountry] = useState('US');

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
    }, []);

    const getFlag = (code: string) => {
        const flags: Record<string, string> = {
            'US': '🇺🇸', 'IN': '🇮🇳', 'GB': '🇬🇧', 'CA': '🇨🇦', 'AU': '🇦🇺'
        };
        return flags[code] || '🌍';
    };

    return (
        <div className={styles.container}>
            <Sidebar isCollapsed={isCollapsed} toggle={() => setIsCollapsed(!isCollapsed)} />
            <main
                className={styles.main}
                style={{
                    marginLeft: isCollapsed ? '80px' : '250px',
                    maxWidth: isCollapsed ? 'calc(100% - 80px)' : 'calc(100% - 250px)',
                    transition: 'margin-left 0.3s ease, max-width 0.3s ease'
                }}
            >
                <div className={styles.regionBadge} title="Current Region">
                    <span className={styles.flag}>{getFlag(country)}</span>
                    <span>{country}</span>
                </div>
                <RecommendationsProvider>
                    {children}
                </RecommendationsProvider>
            </main>
        </div>
    );
}
