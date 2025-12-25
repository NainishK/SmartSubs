'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import styles from './layout.module.css';
import { RecommendationsProvider } from '@/context/RecommendationsContext';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);

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
                <RecommendationsProvider>
                    {children}
                </RecommendationsProvider>
            </main>
        </div>
    );
}
