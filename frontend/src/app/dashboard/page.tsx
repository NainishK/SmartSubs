'use client';

import { useEffect, useState, useRef } from 'react';
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

interface Recommendation {
    type: 'watch_now' | 'cancel' | 'subscribe';
    service_name: string;
    items: string[];
    reason: string;
    cost: number;
    savings: number;
    score: number;
}

interface Service {
    id: number;
    name: string;
    logo_url?: string;
}

interface Plan {
    id: number;
    name: string;
    cost: number;
    currency: string;
}

export default function Dashboard() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [selectedServiceId, setSelectedServiceId] = useState<number | 'custom' | ''>('');
    const [selectedPlanId, setSelectedPlanId] = useState<number | ''>('');
    const [newSub, setNewSub] = useState({
        service_name: '',
        cost: 0,
        currency: 'USD',
        billing_cycle: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        next_billing_date: new Date().toISOString().split('T')[0],
    });

    const router = useRouter();
    const dateInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchData();
    }, []);

    // Fetch plans when service changes
    useEffect(() => {
        if (selectedServiceId) {
            fetchPlans(selectedServiceId as number);
            const service = services.find(s => s.id === Number(selectedServiceId));
            if (service) {
                setNewSub(prev => ({ ...prev, service_name: service.name }));
            }
        } else {
            setPlans([]);
            setSelectedPlanId('');
        }
    }, [selectedServiceId, services]);

    // Update cost when plan changes
    useEffect(() => {
        if (selectedPlanId) {
            const plan = plans.find(p => p.id === Number(selectedPlanId));
            if (plan) {
                setNewSub(prev => ({ ...prev, cost: plan.cost, currency: plan.currency }));
            }
        }
    }, [selectedPlanId, plans]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/login');
    };

    const fetchData = async () => {
        try {
            const [subsRes, watchRes, recsRes, servicesRes] = await Promise.all([
                api.get('/subscriptions/'),
                api.get('/watchlist/'),
                api.get('/recommendations'),
                api.get('/services/')
            ]);
            setSubscriptions(subsRes.data);
            setWatchlist(watchRes.data);
            setRecommendations(recsRes.data);
            setServices(servicesRes.data);
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlans = async (serviceId: number) => {
        try {
            const response = await api.get(`/services/${serviceId}/plans`);
            setPlans(response.data);
        } catch (error) {
            console.error('Failed to fetch plans', error);
        }
    };

    const fetchSubscriptions = async () => {
        try {
            const response = await api.get('/subscriptions/');
            setSubscriptions(response.data);
        } catch (error) {
            console.error('Failed to fetch subscriptions', error);
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

    const fetchRecommendations = async () => {
        try {
            const response = await api.get('/recommendations');
            setRecommendations(response.data);
        } catch (error) {
            console.error('Failed to fetch recommendations', error);
        }
    };

    const handleAddSubscription = async (e: React.FormEvent) => {
        e.preventDefault();

        // For tracking, we'll assume the subscription starts "today" if not specified.
        // The critical field is next_billing_date which the user now provides directly.

        const subData = {
            ...newSub,
            start_date: new Date().toISOString().split('T')[0] // Default to today
        };

        try {
            await api.post('/subscriptions/', subData);
            // Reset form
            setNewSub({
                service_name: '',
                cost: 0,
                currency: 'USD',
                billing_cycle: 'monthly',
                start_date: new Date().toISOString().split('T')[0],
                next_billing_date: new Date().toISOString().split('T')[0],
            });
            setSelectedServiceId('');
            setSelectedPlanId('');

            fetchSubscriptions();
            fetchRecommendations();
        } catch (error) {
            console.error('Failed to add subscription', error);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/subscriptions/${id}`);
            fetchSubscriptions();
            fetchRecommendations();
        } catch (error) {
            console.error('Failed to delete subscription', error);
        }
    };

    const handleDeleteWatchlist = async (id: number) => {
        try {
            await api.delete(`/watchlist/${id}`);
            fetchWatchlist();
            fetchRecommendations();
        } catch (error) {
            console.error('Failed to delete watchlist item', error);
        }
    };

    const totalCost = subscriptions.reduce((acc, sub) => acc + sub.cost, 0);

    const watchNowRecs = recommendations.filter(r => r.type === 'watch_now');
    const cancelRecs = recommendations.filter(r => r.type === 'cancel');

    if (loading) return <div className={styles.loading}>Loading...</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Dashboard</h1>
                <div className={styles.stats}>
                    <Link href="/settings" style={{ marginRight: '1rem', color: '#0070f3', textDecoration: 'none' }}>Settings</Link>
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

                        {recommendations.length === 0 && (
                            <p style={{ color: '#666', fontStyle: 'italic' }}>No recommendations yet. Add more items to your watchlist!</p>
                        )}

                        {/* Watch Now Section */}
                        {watchNowRecs.length > 0 && (
                            <div className={styles.recGroup}>
                                <h3 className={styles.recGroupTitle} style={{ color: '#2e7d32' }}>
                                    ✅ Watch Now
                                </h3>
                                <div className={styles.recGrid}>
                                    {watchNowRecs.map((rec, index) => (
                                        <div key={index} className={`${styles.recCard} ${styles.recCardGreen}`}>
                                            <div className={styles.recHeader}>
                                                <h4>{rec.service_name}</h4>
                                                <span className={styles.badge}>Included</span>
                                            </div>
                                            <p className={styles.recReason}>{rec.reason}</p>
                                            <div className={styles.recTags}>
                                                {rec.items.map((item, i) => (
                                                    <span key={i} className={styles.tag}>{item}</span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Cancel Section */}
                        {cancelRecs.length > 0 && (
                            <div className={styles.recGroup} style={{ marginTop: '1.5rem' }}>
                                <h3 className={styles.recGroupTitle} style={{ color: '#c62828' }}>
                                    ⚠️ Unused Subscriptions
                                </h3>
                                <div className={styles.recGrid}>
                                    {cancelRecs.map((rec, index) => (
                                        <div key={index} className={`${styles.recCard} ${styles.recCardRed}`}>
                                            <div className={styles.recHeader}>
                                                <h4>{rec.service_name}</h4>
                                                <span className={styles.savingsBadge}>Save ${rec.savings}</span>
                                            </div>
                                            <p className={styles.recReason}>{rec.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                <section className={styles.addSection}>
                    <h2>Add Subscription</h2>
                    <form onSubmit={handleAddSubscription} className={styles.form}>
                        {/* Service Dropdown */}
                        <select
                            value={selectedServiceId}
                            onChange={(e) => setSelectedServiceId(Number(e.target.value))}
                            required
                            className={styles.input}
                        >
                            <option value="">Select Service</option>
                            {services.map(service => (
                                <option key={service.id} value={service.id}>{service.name}</option>
                            ))}
                            <option value="custom">Other (Custom)</option>
                        </select>

                        {/* Custom Service Name (if 'Other' selected) */}
                        {selectedServiceId === 'custom' && (
                            <input
                                type="text"
                                placeholder="Service Name"
                                value={newSub.service_name}
                                onChange={(e) => setNewSub({ ...newSub, service_name: e.target.value })}
                                required
                                className={styles.input}
                            />
                        )}

                        {/* Plan Dropdown (if service has plans) */}
                        {plans.length > 0 && selectedServiceId !== 'custom' && (
                            <select
                                value={selectedPlanId}
                                onChange={(e) => setSelectedPlanId(Number(e.target.value))}
                                className={styles.input}
                            >
                                <option value="">Select Plan</option>
                                {plans.map(plan => (
                                    <option key={plan.id} value={plan.id}>{plan.name} - ${plan.cost}</option>
                                ))}
                            </select>
                        )}

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

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Next Billing Date</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    ref={dateInputRef}
                                    type="date"
                                    value={newSub.next_billing_date}
                                    onChange={(e) => setNewSub({ ...newSub, next_billing_date: e.target.value })}
                                    className={styles.input}
                                    style={{ width: '100%' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        try {
                                            // @ts-ignore
                                            dateInputRef.current?.showPicker();
                                        } catch (e) { }
                                    }}
                                    style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '1.2rem',
                                        lineHeight: 1
                                    }}
                                    title="Open Calendar"
                                >
                                    📅
                                </button>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                                We'll remind you before this date.
                            </p>
                        </div>
                        <button type="submit" className={styles.button}>Add</button>
                    </form>
                </section>
            </div>
        </div>
    );
}
