import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Subscription Manager</h1>
      <p className={styles.description}>Manage your subscriptions and save money.</p>
      <div className={styles.grid}>
        <Link href="/login" className={styles.card}>
          <h2>Login &rarr;</h2>
          <p>Access your dashboard.</p>
        </Link>
        <Link href="/signup" className={styles.card}>
          <h2>Sign Up &rarr;</h2>
          <p>Create a new account.</p>
        </Link>
      </div>
    </main>
  );
}
