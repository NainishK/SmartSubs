'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import styles from '../dashboard.module.css';
import { Subscription, Service, Plan } from '@/lib/types';

export default function SubscriptionsPage() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
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

    const fetchData = async () => {
        try {
            const [subsRes, servicesRes] = await Promise.all([
                api.get('/subscriptions/'),
                api.get('/services/')
            ]);
            setSubscriptions(subsRes.data);
            setServices(servicesRes.data);
        } catch (error) {
            console.error('Failed to fetch data', error);
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

    const handleAddSubscription = async (e: React.FormEvent) => {
        e.preventDefault();
        const subData = {
            ...newSub,
            start_date: new Date().toISOString().split('T')[0]
        };

        try {
            await api.post('/subscriptions/', subData);
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

    if (loading) return <div className={styles.loading}>Loading...</div>;

    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>Subscriptions</h1>

            <div className={styles.content}>
                <div className={styles.leftColumn}>
                    <section className={styles.listSection}>
                        <h2>Active Subscriptions</h2>
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
                </div>

                <section className={styles.addSection}>
                    <h2>Add New</h2>
                    <form onSubmit={handleAddSubscription} className={styles.form}>
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
                        </div>
                        <button type="submit" className={styles.button}>Add Subscription</button>
                    </form>
                </section>
            </div>
        </div>
    );
}
