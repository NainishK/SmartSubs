import Link from 'next/link';
import Image from 'next/image';
import { Search, Bot, Wallet, Sparkles, TrendingUp } from 'lucide-react';
import FeatureCarousel from '@/components/FeatureCarousel';
import AppShowcaseStack from '@/components/landing/AppShowcaseStack';
import styles from './page.module.css';

export default function Home() {
  const discoveryImages = [
    { src: '/screenshots/search.png', alt: 'Smart Search UI' },
    { src: '/screenshots/watchlist.png', alt: 'Unified Watchlist' },
    { src: '/screenshots/watchlist_item_details.png', alt: 'Watchlist Details' },
    { src: '/screenshots/recommendations1.png', alt: 'Top Recommendations' },
    { src: '/screenshots/recommendations2.png', alt: 'More Recommendations' },
  ];

  const aiImages = [
    { src: '/screenshots/AI_center_profile.png', alt: 'AI Profile' },
    { src: '/screenshots/AI_center_curator_picks.png', alt: 'Curator Picks' },
    { src: '/screenshots/AI_center_smart_strategy.png', alt: 'Smart Strategy' },
  ];

  return (
    <main className={styles.main}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.brand}>SmartSubs.</div>
        <div className={styles.navLinks}>
          <Link href="/login" className={styles.navLink}>Log In</Link>
          <Link href="/signup" className={`${styles.loginBtn}`}>Sign Up Free</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.badge}>✨ New: AI Recommendations</span>
          <h1 className={styles.title}>
            Master Your <br />
            <span className={styles.titleHighlight}>Digital Life.</span>
          </h1>
          <p className={styles.subtitle}>
            Stop paying for ghost subscriptions. Track, Manage, and Discover
            content across all your services in one intelligent dashboard.
          </p>
          <div className={styles.ctaGroup}>
            <Link href="/signup" className={styles.primaryBtn}>
              Get Started Free
            </Link>
            <Link href="#features" className={styles.secondaryBtn}>
              See Features
            </Link>
          </div>
        </div>
      </section>

      {/* Visual Showcase (Abstract Dashboard) */}
      <section className={styles.visualSection}>
        <div className={styles.dashboardPreview}>
          <div className={styles.browserWindow}>
            <div className={styles.windowInner}>
              <div className={styles.windowHeader}>
                <div className={`${styles.windowDot} ${styles.red}`} />
                <div className={`${styles.windowDot} ${styles.yellow}`} />
                <div className={`${styles.windowDot} ${styles.green}`} />
                <div className={styles.addressBar}>smartsubs.app/dashboard</div>
              </div>
              <div className={styles.windowContent}>
                <Image
                  src="/screenshots/overview.png"
                  alt="SmartSubs Dashboard Overview"
                  width={1200}
                  height={800}
                  className={styles.heroImage}
                  priority
                />
              </div>
            </div>
            {/* Floating Badge Accent */}
            <div className={styles.floatingBadge}>
              <div className={styles.badgeIconWrapper}>
                <TrendingUp size={24} color="#10b981" />
              </div>
              <div className={styles.badgeText}>
                <span className={styles.badgeLabel}>Annual Savings projected</span>
                <span className={styles.badgeValue}>₹2,400.00</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Zig-Zag */}
      <section id="features" className={styles.features}>

        {/* Row 1: Smart Discovery */}
        <div className={styles.featureRow}>
          <div className={styles.featureContent}>
            <div className={styles.featureIcon}>
              <Search size={32} color="#60a5fa" />
            </div>
            <h3 className={styles.featureTitle}>Smart Discovery.</h3>
            <p className={styles.featureDesc}>
              Stop juggling apps. Search for any movie or TV show and instantly see which of your
              active subscriptions has it. Never pay for a rental when you already own the platform.
            </p>
          </div>
          <div className={styles.featureVisual}>
            <FeatureCarousel items={discoveryImages} />
          </div>
        </div>

        {/* Row 2: AI Insights (Reversed) */}
        <div className={`${styles.featureRow} ${styles.reversed}`}>
          <div className={styles.featureContent}>
            <div className={styles.featureIcon}>
              <Sparkles size={32} color="#c084fc" />
            </div>
            <h3 className={styles.featureTitle}>AI Curator.</h3>
            <p className={styles.featureDesc}>
              "You watch a lot of Sci-Fi." Our Gemini-powered AI analyzes your watchlist and
              subscriptions to suggest hidden gems tailored to your unique taste.
            </p>
          </div>
          <div className={styles.featureVisual}>
            <FeatureCarousel items={aiImages} reverse />
          </div>
        </div>

        {/* Row 3: Waste Killer */}
        <div className={styles.featureRow}>
          <div className={styles.featureContent}>
            <div className={styles.featureIcon}>
              <Wallet size={32} color="#34d399" />
            </div>
            <h3 className={styles.featureTitle}>Waste Killer.</h3>
            <p className={styles.featureDesc}>
              Identify "Zombie Subscriptions" you haven't used in months.
              Visualize your monthly spending and optimize your budget with clear analytics.
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
