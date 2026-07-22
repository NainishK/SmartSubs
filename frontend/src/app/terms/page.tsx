import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileCheck, AlertCircle, Scale, ShieldAlert, Mail, UserX, RefreshCw } from 'lucide-react';
import styles from '../privacy/privacy.module.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'BingeSensei Terms of Service - User guidelines and terms of use.',
};

export default function TermsOfService() {
  return (
    <div className={styles.container}>
      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} /> Back to Home
      </Link>

      <div className={styles.header}>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.subtitle}>Last updated: July 21, 2026</p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <FileCheck size={20} className="text-indigo-500" /> 1. Acceptance of Terms
        </h2>
        <p className={styles.text}>
          By accessing or using <strong>BingeSensei</strong>, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, please refrain from using our application and services.
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Scale size={20} className="text-indigo-500" /> 2. Description of Service
        </h2>
        <p className={styles.text}>
          BingeSensei provides subscription cost management, watchlist tracking, renewal notifications, and AI-driven content recommendations. 
        </p>
        <p className={styles.text}>
          BingeSensei does not process streaming billing directly. All subscription management actions (cancelling or upgrading external OTT accounts) must be performed directly by you on the respective third-party provider websites.
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <UserX size={20} className="text-indigo-500" /> 3. Account Responsibilities & Acceptable Use
        </h2>
        <p className={styles.text}>
          You are responsible for maintaining the confidentiality of your login credentials. You agree not to misuse BingeSensei by attempting unauthorized access, automated scraping, or disrupting platform services.
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <AlertCircle size={20} className="text-indigo-500" /> 4. Accuracy & Third-Party Metadata
        </h2>
        <p className={styles.text}>
          Streaming availability, catalog updates, and pricing estimates are populated using third-party metadata APIs (including TMDB). While we strive for accuracy, BingeSensei does not guarantee that third-party streaming availability data will always reflect real-time provider changes.
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <ShieldAlert size={20} className="text-indigo-500" /> 5. Limitation of Liability
        </h2>
        <p className={styles.text}>
          BingeSensei is provided on an "AS IS" and "AS AVAILABLE" basis. BingeSensei is not liable for missed subscription cancellation deadlines or unexpected charges incurred on third-party streaming services.
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <RefreshCw size={20} className="text-indigo-500" /> 6. Changes to Terms
        </h2>
        <p className={styles.text}>
          We reserve the right to update or modify these Terms of Service at any time. Continued use of BingeSensei after changes are posted constitutes acceptance of the updated terms.
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Mail size={20} className="text-indigo-500" /> 7. Contact Information
        </h2>
        <p className={styles.text}>
          For any questions regarding these Terms of Service or general feedback, please contact us at:
        </p>
        <p className={styles.text}>
          <strong>Email:</strong> nainishkher@gmail.com
        </p>
      </div>
    </div>
  );
}

