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
}

export default function Sidebar({ isCollapsed, toggle }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);

    const navItems = [
        { name: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
        { name: 'Subscriptions', icon: CreditCard, path: '/dashboard/subscriptions' },
        { name: 'Watchlist', icon: TvMinimalPlay, path: '/dashboard/watchlist' },
        { name: 'Recommendations', icon: Sparkles, path: '/dashboard/recommendations' },
        { name: 'Settings', icon: Settings, path: '/settings' },
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
            <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
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
