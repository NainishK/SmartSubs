import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, Eye, Mail, FileText, Database, UserCheck, HardDrive } from 'lucide-react';
import styles from './privacy.module.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'BingeSensei Privacy Policy - Learn how we collect, protect, and handle your data.',
};

export default function PrivacyPolicy() {
  return (
    <div className={styles.container}>
      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} /> Back to Home
      </Link>

      <div className={styles.header}>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.subtitle}>Last updated: July 21, 2026</p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <ShieldCheck size={20} className="text-indigo-500" /> 1. Overview & Commitment
        </h2>
        <p className={styles.text}>
          At <strong>BingeSensei</strong>, we prioritize your privacy. This Privacy Policy explains how we collect, use, store, and protect your information when you use our website, application, and related services.
        </p>
        <p className={styles.text}>
          We do not sell, rent, monetise, or trade your personal data to third parties under any circumstances.
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Eye size={20} className="text-indigo-500" /> 2. Information We Collect
        </h2>
        <p className={styles.text}>We collect only the essential data required to provide our service:</p>
        <ul className={styles.list}>
          <li><strong>Account Data:</strong> Your name, email address, profile picture (via Google OAuth or email sign-up), and regional preferences (e.g., country and currency).</li>
          <li><strong>Subscription & Watchlist Data:</strong> Information you voluntarily add, such as active streaming services, renewal dates, billing prices, and media watchlists.</li>
          <li><strong>Usage & Preference Data:</strong> Notification preferences (email alerts), deal-breaker genres, and UI theme preferences.</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Lock size={20} className="text-indigo-500" /> 3. How We Use Your Data
        </h2>
        <p className={styles.text}>Your data is used solely to deliver and optimize your BingeSensei experience:</p>
        <ul className={styles.list}>
          <li>To calculate monthly spending metrics and highlight upcoming subscription renewal dates.</li>
          <li>To match items in your watchlist with content availability across your active streaming services.</li>
          <li>To deliver opt-in email notifications for upcoming renewal alerts (which you can manage at any time).</li>
          <li>To power personalized AI recommendations tailored to your preferred genres and regional provider availability.</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Database size={20} className="text-indigo-500" /> 4. Data Security & Storage
        </h2>
        <p className={styles.text}>
          Your data is stored securely in encrypted database clusters with strict access controls. Authentication tokens (JWTs) and password hashes (bcrypt) adhere to industry security standards.
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <HardDrive size={20} className="text-indigo-500" /> 5. Cookies & Local Storage
        </h2>
        <p className={styles.text}>
          BingeSensei uses local storage and essential session cookies strictly for authentication and user session management. We do not use third-party tracking or advertising cookies.
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <UserCheck size={20} className="text-indigo-500" /> 6. Your Rights & Data Control
        </h2>
        <p className={styles.text}>
          You retain full ownership of your data. You may update your profile preferences, export your watchlist, or request full account and data deletion at any time via your account settings or by contacting support.
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Mail size={20} className="text-indigo-500" /> 7. Contact Us
        </h2>
        <p className={styles.text}>
          If you have questions, concerns, or requests regarding your privacy or data, please reach out to us at:
        </p>
        <p className={styles.text}>
          <strong>Email:</strong> nainishkher@gmail.com
        </p>
      </div>
    </div>
  );
}

