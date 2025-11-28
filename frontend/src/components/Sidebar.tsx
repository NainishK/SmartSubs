'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './Sidebar.module.css';

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const navItems = [
        { name: 'Overview', path: '/dashboard' },
        { name: 'Subscriptions', path: '/dashboard/subscriptions' },
        { name: 'Watchlist', path: '/dashboard/watchlist' },
        { name: 'Recommendations', path: '/dashboard/recommendations' },
        { name: 'Settings', path: '/settings' },
    ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/login');
    };

    return (
        <aside className={styles.sidebar}>
            <Link href="/dashboard" className={styles.logo}>
                SmartSubs
            </Link>
            <nav className={styles.nav}>
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                        >
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
            <div className={styles.footer}>
                <button onClick={handleLogout} className={styles.logoutBtn}>
                    Logout
                </button>
            </div>
        </aside>
    );
}
