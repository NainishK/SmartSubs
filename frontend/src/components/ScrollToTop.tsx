'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';
import styles from './ScrollToTop.module.css';

export default function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    const pathname = usePathname();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // On mobile watchlist, we have a custom stacked FAB, so hide this one
    if (pathname === '/dashboard/watchlist' && isMobile) {
        return null;
    }

    return (
        <button
            onClick={scrollToTop}
            className={`${styles.scrollToTopBtn} ${isVisible ? styles.visible : ''}`}
            aria-label="Scroll to top"
        >
            <ArrowUp size={24} strokeWidth={2.5} />
        </button>
    );
}
