'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import styles from './dashboard.module.css';
import Link from 'next/link';

interface Subscription {
    id: number;
    service_name: string;
    cost: number;
    currency: string;
    billing_cycle: string;
    start_date: string;
    next_billing_date: string;
    is_active: boolean;
}

interface WatchlistItem {
    id: number;
    title: string;
    media_type: string;
    poster_path?: string;
}

export default function Dashboard() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [newSub, setNewSub] = useState({
        service_name: '',
        cost: 0,
        currency: 'USD',
        billing_cycle: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        next_billing_date: new Date().toISOString().split('T')[0],
    });
    const router = useRouter();

    useEffect(() => {
        fetchSubscriptions();
        fetchWatchlist();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/login');
    };

    const fetchSubscriptions = async () => {
        try {
            const response = await api.get('/subscriptions/');
            setSubscriptions(response.data);
        } catch (error) {
            console.error('Failed to fetch subscriptions', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWatchlist = async () => {
        try {
            const response = await api.get('/watchlist/');
            setWatchlist(response.data);
        } catch (error) {
            console.error('Failed to fetch watchlist', error);
        }
    };

    const handleAddSubscription = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/subscriptions/', newSub);
            setNewSub({
                service_name: '',
                cost: 0,
                currency: 'USD',
                billing_cycle: 'monthly',
                start_date: new Date().toISOString().split('T')[0],
                next_billing_date: new Date().toISOString().split('T')[0],
            });
            fetchSubscriptions();
        } catch (error) {
            console.error('Failed to add subscription', error);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/subscriptions/${id}`);
            fetchSubscriptions();
        } catch (error) {
            console.error('Failed to delete subscription', error);
        }
    };

    const handleDeleteWatchlist = async (id: number) => {
        try {
            await api.delete(`/watchlist/${id}`);
            fetchWatchlist();
        } catch (error) {
            console.error('Failed to delete watchlist item', error);
        }
    };

    const totalCost = subscriptions.reduce((acc, sub) => acc + sub.cost, 0);

    if (loading) return <div className={styles.loading}>Loading...</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Dashboard</h1>
                <div className={styles.stats}>
                    <span>Total Monthly Cost: ${totalCost.toFixed(2)}</span>
                    <button onClick={handleLogout} className={styles.button} style={{ marginLeft: '1rem', backgroundColor: '#666' }}>Logout</button>
                </div>
            </header>

            <div className={styles.content}>
                <div className={styles.leftColumn}>
                    <section className={styles.listSection}>
                        <h2>Your Subscriptions</h2>
                        <ul className={styles.list}>
                            {subscriptions.map((sub) => (
                                <li key={sub.id} className={styles.listItem}>
                                    <div className={styles.subInfo}>
                                        <h3>{sub.service_name}</h3>
                                        <p>{sub.billing_cycle} - ${sub.cost}</p>
                                    </div>
                                    <button onClick={() => handleDelete(sub.id)} className={styles.deleteBtn}>Cancel</button>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className={styles.listSection} style={{ marginTop: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2>Watchlist</h2>
                            <Link href="/search" style={{ color: '#0070f3', textDecoration: 'none' }}>+ Add Movies/TV</Link>
                        </div>
                        <ul className={styles.list}>
                            {watchlist.map((item) => (
                                <li key={item.id} className={styles.listItem}>
                                    <div className={styles.subInfo}>
                                        <h3>{item.title}</h3>
                                        <p>{item.media_type}</p>
                                    </div>
                                    <button onClick={() => handleDeleteWatchlist(item.id)} className={styles.deleteBtn}>Remove</button>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className={styles.listSection} style={{ marginTop: '2rem' }}>
                        <h2>Recommendations</h2>
                        <div style={{ padding: '1rem', background: '#e6f7ff', borderRadius: '4px' }}>
                            <p className={styles.recommendationText}>Based on your watchlist, you should consider:</p>
                            <ul className={styles.recommendationList} style={{ listStyle: 'none', padding: 0 }}>
                                <li style={{ marginBottom: '0.5rem' }}><strong>Netflix</strong> - Available: 3 items ($15.49)</li>
                                <li><strong>Hulu</strong> - Available: 1 item ($7.99)</li>
                            </ul>
                        </div>
                    </section>
                </div>

                <section className={styles.addSection}>
                    <h2>Add Subscription</h2>
                    <form onSubmit={handleAddSubscription} className={styles.form}>
                        <input
                            type="text"
                            placeholder="Service Name"
                            value={newSub.service_name}
                            onChange={(e) => setNewSub({ ...newSub, service_name: e.target.value })}
                            required
                            className={styles.input}
                        />
                        <input
                            type="number"
                            placeholder="Cost"
                            value={newSub.cost || ''}
                            onChange={(e) => setNewSub({ ...newSub, cost: parseFloat(e.target.value) || 0 })}
                            required
                            className={styles.input}
                        />
                        <select
                            value={newSub.billing_cycle}
                            onChange={(e) => setNewSub({ ...newSub, billing_cycle: e.target.value })}
                            className={styles.input}
                        >
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                        <input
                            type="date"
                            value={newSub.start_date}
                            onChange={(e) => setNewSub({ ...newSub, start_date: e.target.value })}
                            className={styles.input}
                        />
                        <button type="submit" className={styles.button}>Add</button>
                    </form>
                </section>
            </div>
        </div>
    );
}
