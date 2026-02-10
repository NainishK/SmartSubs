import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    CreditCard,
    TvMinimalPlay,
    Sparkles,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import styles from './Sidebar.module.css';
import ConfirmationModal from './ConfirmationModal';

interface SidebarProps {
    isCollapsed: boolean;
    toggle: () => void;
    className?: string;
    countryCode?: string | null;
}

export default function Sidebar({ isCollapsed, toggle, className = '', countryCode }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);

    const getFlag = (code: string) => {
        const flags: Record<string, string> = {
            'US': '🇺🇸', 'IN': '🇮🇳', 'GB': '🇬🇧', 'CA': '🇨🇦', 'AU': '🇦🇺'
        };
        return flags[code] || '🌍';
    };

    const getCountryName = (code: string) => {
        const names: Record<string, string> = {
            'US': 'United States',
            'IN': 'India',
            'GB': 'United Kingdom',
            'CA': 'Canada',
            'AU': 'Australia'
        };
        return names[code] || code;
    };

    const navItems = [
        { name: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
        { name: 'Subscriptions', icon: CreditCard, path: '/dashboard/subscriptions' },
        { name: 'Watchlist', icon: TvMinimalPlay, path: '/dashboard/watchlist' },
        { name: 'Recommendations', icon: Sparkles, path: '/dashboard/recommendations' },
        { name: 'Profile', icon: Settings, path: '/profile' },
    ];

    const handleLogoutClick = () => {
        setLogoutModalOpen(true);
    };

    const confirmLogout = () => {
        localStorage.removeItem('token');
        router.push('/login');
        setLogoutModalOpen(false);
    };

    return (
        <>
            {/* Mobile Overlay - Only visible on mobile when sidebar is open (not collapsed) */}
            {!isCollapsed && (
                <div className={styles.mobileOverlay} onClick={toggle} aria-hidden="true" />
            )}

            <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''} ${className}`}>
                <div className={styles.header}>
                    {!isCollapsed && (
                        <Link href="/dashboard" className={styles.logo}>
                            SmartSubs
                        </Link>
                    )}
                    <button onClick={toggle} className={styles.toggleBtn} title={isCollapsed ? "Expand" : "Collapse"}>
                        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>
                </div>

                <nav className={styles.nav}>
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                                title={isCollapsed ? item.name : ''}
                                onClick={() => {
                                    if (window.innerWidth < 768) {
                                        toggle();
                                    }
                                }}
                            >
                                <span className={styles.icon}>
                                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                </span>
                                {!isCollapsed && <span className={styles.label}>{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className={styles.footer}>
                    {/* Region Badge in Sidebar */}
                    <div className={styles.regionBadge}>
                        {countryCode ? (
                            <>
                                <span className={styles.flag}>{getFlag(countryCode)}</span>
                                {!isCollapsed && <span className={styles.regionText}>{getCountryName(countryCode)}</span>}
                            </>
                        ) : (
                            !isCollapsed ? (
                                <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
                            ) : (
                                <div className="h-6 w-6 bg-gray-200 rounded-full animate-pulse" />
                            )
                        )}
                    </div>

                    <button onClick={handleLogoutClick} className={styles.logoutBtn} title="Logout">
                        <span className={styles.icon}><LogOut size={20} /></span>
                        {!isCollapsed && <span className={styles.label}>Logout</span>}
                    </button>
                </div>
            </aside>

            <ConfirmationModal
                isOpen={logoutModalOpen}
                onClose={() => setLogoutModalOpen(false)}
                onConfirm={confirmLogout}
                title="Confirm Logout"
                message="Are you sure you want to log out?"
                confirmLabel="Logout"
                isDangerous={false}
            />
        </>
    );
}
