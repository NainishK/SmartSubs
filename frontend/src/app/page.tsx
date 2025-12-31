import Link from 'next/link';
import { Search, Bot, Wallet, Sparkles } from 'lucide-react';
import styles from './page.module.css';

export default function Home() {
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
          <div className={styles.mockDashboard}>
            <div className={styles.mockSidebar}>
              <div className={styles.mockSidebarLine} />
              <div className={styles.mockSidebarItem} />
              <div className={styles.mockSidebarItem} />
              <div className={styles.mockSidebarItem} />
              <div className={styles.mockSidebarItem} style={{ marginTop: 'auto' }} />
            </div>
            <div className={styles.mockContent}>
              <div className={styles.mockHeader}>
                <div className={styles.mockTitle} />
                <div className={styles.mockUser} />
              </div>
              <div className={styles.mockGrid}>
                <div className={styles.mockCard}>
                  <div className={styles.mockCardLine} />
                </div>
                <div className={styles.mockCard}>
                  <div className={styles.mockCardLine} />
                </div>
                <div className={styles.mockCard}>
                  <div className={styles.mockCardLine} />
                </div>
              </div>
              <div style={{
                marginTop: '2rem',
                height: '100px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '12px'
              }} />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className={styles.features}>
        <div className={styles.grid}>
          {/* Feature 1 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <Search size={32} color="#60a5fa" />
            </div>
            <h3>Smart Discovery</h3>
            <p>
              Instantly find which service has the movie you want.
              Never pay for a rental when you already subscribe to the platform.
            </p>
          </div>

          {/* Feature 2 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <Sparkles size={32} color="#c084fc" />
            </div>
            <h3>AI Insights</h3>
            <p>
              "You watch a lot of Sci-Fi." Our AI suggests hidden gems
              tailored to your unique taste profile and subscription stack.
            </p>
          </div>

          {/* Feature 3 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <Wallet size={32} color="#34d399" />
            </div>
            <h3>Waste Killer</h3>
            <p>
              Identify unused subscriptions and ghost charges.
              Visualize your monthly spend and optimize your budget.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
