'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './CookieBanner.module.css';

export default function CookieBanner() {
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    const consent = localStorage.getItem('bingesensei_cookie_consent');
    if (!consent) {
      // Small delay before showing banner for slick entrance
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('bingesensei_cookie_consent', 'accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('bingesensei_cookie_consent', 'essential_only');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside aria-label="Cookie consent" className={styles.bannerContainer}>
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={styles.icon}>🍪</span>
          <h2 className={styles.title}>Privacy & Cookie Preferences</h2>
        </div>
        <p className={styles.description}>
          We use essential cookies to maintain your session and security. With your permission, we also use anonymized analytics to improve your experience.{' '}
          <Link href="/privacy" className={styles.link}>
            Privacy Policy
          </Link>
        </p>
        <div className={styles.actions}>
          <button onClick={handleDecline} className={styles.declineBtn}>
            Essential Only
          </button>
          <button onClick={handleAccept} className={styles.acceptBtn}>
            Accept All
          </button>
        </div>
      </div>
    </aside>
  );
}
