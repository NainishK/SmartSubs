'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import styles from './subscriptions.module.css';
import { Subscription, Service, Plan } from '@/lib/types';
import { Trash2, Plus, Calendar, DollarSign, Tag, X, Edit2 } from 'lucide-react';
import { useRecommendations } from '@/context/RecommendationsContext';
import { formatCurrency, getCurrencySymbol } from '@/lib/currency';

const SERVICE_DOMAINS: Record<string, string> = {
    'Netflix': 'netflix.com',
    'Amazon Prime Video': 'primevideo.com',
    'Disney Plus': 'disneyplus.com',
    'Spotify': 'spotify.com',
    'Hulu': 'hulu.com',
    'Max': 'max.com',
    'Apple TV+': 'apple.com',
    'YouTube Premium': 'youtube.com',
    'Peacock': 'peacocktv.com',
    'Paramount+': 'paramountplus.com'
};

const getServiceLogo = (name: string) => {
    const domain = SERVICE_DOMAINS[name];
    if (domain) {
        return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
    }
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `https://www.google.com/s2/favicons?sz=128&domain=${slug}.com`;
};

export default function SubscriptionsPage() {
    const { refreshRecommendations } = useRecommendations();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [userCountry, setUserCountry] = useState('US');

    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [editSubId, setEditSubId] = useState<number | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [subToDelete, setSubToDelete] = useState<Subscription | null>(null);

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

    useEffect(() => {
        if (selectedServiceId && selectedServiceId !== 'custom') {
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

    useEffect(() => {
        if (selectedPlanId) {
            const plan = plans.find(p => p.id === Number(selectedPlanId));
            if (plan) {
                setNewSub(prev => ({
                    ...prev,
                    cost: plan.cost,
                    currency: plan.currency,
                    billing_cycle: plan.billing_cycle
                }));
            }
        }
    }, [selectedPlanId, plans]);

    const fetchData = async () => {
        try {
            const [subsRes, servicesRes, profileRes] = await Promise.all([
                api.get('/subscriptions/'),
                api.get('/services/'),
                api.get('/users/me/')
            ]);
            setSubscriptions(subsRes.data);
            setServices(servicesRes.data);
            const country = profileRes.data.country || 'US';
            setUserCountry(country);

            // Set initial currency based on profile
            setNewSub(prev => ({ ...prev, currency: country === 'IN' ? 'INR' : 'USD' }));
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

    const resetForm = () => {
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
        setIsEditing(false);
        setEditSubId(null);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (isEditing && editSubId) {
                await api.put(`/subscriptions/${editSubId}`, newSub);
            } else {
                const subData = {
                    ...newSub,
                    start_date: new Date().toISOString().split('T')[0]
                };
                await api.post('/subscriptions/', subData);
            }

            resetForm();
            fetchSubscriptions();

            // Auto-refresh recommendations after any change
            refreshRecommendations();

        } catch (error) {
            console.error('Failed to save subscription', error);
        }
    };

    const handleEditClick = (sub: Subscription) => {
        setIsEditing(true);
        setEditSubId(sub.id);

        // Find if it's a known service
        const service = services.find(s => s.name === sub.service_name);
        if (service) {
            setSelectedServiceId(service.id);
        } else {
            setSelectedServiceId('custom');
        }

        setNewSub({
            service_name: sub.service_name,
            cost: sub.cost,
            currency: sub.currency,
            billing_cycle: sub.billing_cycle,
            start_date: sub.start_date,
            next_billing_date: sub.next_billing_date,
        });

        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const openDeleteModal = (sub: Subscription) => {
        setSubToDelete(sub);
        setIsModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsModalOpen(false);
        setSubToDelete(null);
    };

    const confirmDelete = async () => {
        if (!subToDelete) return;
        try {
            await api.delete(`/subscriptions/${subToDelete.id}`);
            fetchSubscriptions();
            closeDeleteModal();

            // If we were editing this sub, reset form
            if (editSubId === subToDelete.id) {
                resetForm();
            }

            // Auto-refresh recommendations after deleting a subscription
            refreshRecommendations();

        } catch (error) {
            console.error('Failed to delete subscription', error);
        }
    };

    // Service Icon Helper
    const ServiceIcon = ({ name, logoUrl: propLogoUrl }: { name: string, logoUrl?: string }) => {
        const [error, setError] = useState(false);
        const logoUrl = propLogoUrl || getServiceLogo(name);

        if (error || !logoUrl) {
            const stringToColor = (str: string) => {
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    hash = str.charCodeAt(i) + ((hash << 5) - hash);
                }
                const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
                return '#' + '00000'.substring(0, 6 - c.length) + c;
            };
            return (
                <div className={styles.fallbackLogo} style={{ backgroundColor: stringToColor(name) }}>
                    {name.charAt(0).toUpperCase()}
                </div>
            );
        }

        return (
            <img src={logoUrl} alt={name} className={styles.serviceLogo} onError={() => setError(true)} />
        );
    };

    if (loading) return <div className={styles.loading}>Loading your subscriptions...</div>;

    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>My Subscriptions</h1>

            <div className={styles.content}>
                <div className={styles.leftColumn}>
                    <div className={styles.subGrid}>
                        {subscriptions.map((sub) => (
                            <div key={sub.id} className={styles.subCard}>
                                <div className={styles.subHeader}>
                                    <div className={styles.serviceIdentity}>
                                        <ServiceIcon name={sub.service_name} logoUrl={sub.logo_url} />
                                        <h3 className={styles.serviceName}>{sub.service_name}</h3>
                                    </div>
                                    <span className={styles.statusBadge}>Active</span>
                                </div>

                                <div className={styles.subBody}>
                                    <div className={styles.costSection}>
                                        <p className={styles.costValue}>{formatCurrency(sub.cost, userCountry)}</p>
                                        <span className={styles.billingPeriod}>per {sub.billing_cycle === 'monthly' ? 'month' : 'year'}</span>
                                    </div>

                                    <div className={styles.billingDetail}>
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>Next Bill</span>
                                            <span className={styles.detailValue}>{new Date(sub.next_billing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.subFooter}>
                                    <button onClick={() => handleEditClick(sub)} className={styles.editBtn}>
                                        <Edit2 size={14} />
                                        Edit
                                    </button>
                                    <button onClick={() => openDeleteModal(sub)} className={styles.deleteBtn}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.rightColumn}>
                    <section className={styles.addSection}>
                        <h2 className={styles.sectionTitle}>
                            {isEditing ? 'Edit Subscription' : 'Add New Subscription'}
                        </h2>
                        <form onSubmit={handleFormSubmit} className={styles.form}>
                            <div className={styles.field}>
                                <label>Service</label>
                                <select
                                    value={selectedServiceId}
                                    onChange={(e) => setSelectedServiceId(e.target.value === 'custom' ? 'custom' : Number(e.target.value))}
                                    required
                                    className={styles.input}
                                    disabled={isEditing} // Prevent changing service name when editing for consistency
                                >
                                    <option value="">Select a service</option>
                                    {services.map(service => (
                                        <option key={service.id} value={service.id}>{service.name}</option>
                                    ))}
                                    <option value="custom">Other (Custom)</option>
                                </select>
                            </div>

                            {selectedServiceId === 'custom' && (
                                <div className={styles.field}>
                                    <label>Custom Name</label>
                                    <input
                                        type="text"
                                        placeholder="Enter service name"
                                        value={newSub.service_name}
                                        onChange={(e) => setNewSub({ ...newSub, service_name: e.target.value })}
                                        required
                                        className={styles.input}
                                        disabled={isEditing}
                                    />
                                </div>
                            )}

                            {plans.length > 0 && selectedServiceId !== 'custom' && (
                                <div className={styles.field}>
                                    <label>Plan</label>
                                    <select
                                        value={selectedPlanId}
                                        onChange={(e) => setSelectedPlanId(Number(e.target.value))}
                                        className={styles.input}
                                    >
                                        <option value="">Select a plan</option>
                                        {plans.map(plan => (
                                            <option key={plan.id} value={plan.id}>{plan.name} - {formatCurrency(plan.cost, userCountry)}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className={styles.field}>
                                <label>Cost</label>
                                <div className={styles.iconInputWrapper}>
                                    <span className={styles.currencySymbol}>{getCurrencySymbol(userCountry)}</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={newSub.cost || ''}
                                        onChange={(e) => setNewSub({ ...newSub, cost: parseFloat(e.target.value) || 0 })}
                                        required
                                        className={styles.inputWithIcon}
                                    />
                                </div>
                            </div>

                            <div className={styles.field}>
                                <label>Billing Cycle</label>
                                <select
                                    value={newSub.billing_cycle}
                                    onChange={(e) => setNewSub({ ...newSub, billing_cycle: e.target.value })}
                                    className={styles.input}
                                >
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            </div>

                            <div className={styles.field}>
                                <label>Next Billing Date</label>
                                <div className={styles.iconInputWrapper}>
                                    <input
                                        ref={dateInputRef}
                                        type="date"
                                        value={newSub.next_billing_date}
                                        onChange={(e) => setNewSub({ ...newSub, next_billing_date: e.target.value })}
                                        className={styles.inputWithIcon}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            try {
                                                // @ts-ignore
                                                dateInputRef.current?.showPicker();
                                            } catch (e) { }
                                        }}
                                        className={styles.datePickerBtn}
                                    >
                                        <Calendar size={18} />
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className={styles.button}>
                                {isEditing ? <Edit2 size={18} className={styles.btnIcon} /> : <Plus size={18} className={styles.btnIcon} />}
                                {isEditing ? 'Update Subscription' : 'Add Subscription'}
                            </button>

                            {isEditing && (
                                <button type="button" onClick={resetForm} className={styles.secondaryButton}>
                                    Cancel Editing
                                </button>
                            )}
                        </form>
                    </section>
                </div>
            </div>

            {/* Custom Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={closeDeleteModal}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.modalTitle}>Cancel {subToDelete?.service_name}?</h2>
                        <p className={styles.modalText}>
                            Are you sure you want to remove your <strong>{subToDelete?.service_name}</strong> subscription? This action cannot be undone.
                        </p>
                        <div className={styles.modalActions}>
                            <button className={styles.cancelBtn} onClick={closeDeleteModal}>
                                Keep Subscription
                            </button>
                            <button className={styles.confirmDeleteBtn} onClick={confirmDelete}>
                                Yes, Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
