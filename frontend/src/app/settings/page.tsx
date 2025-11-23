'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';

export default function Settings() {
    const [country, setCountry] = useState('US');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const router = useRouter();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await api.get('/users/me/');
            setCountry(response.data.country || 'US');
        } catch (error) {
            console.error('Failed to fetch profile', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.put(`/users/me?country=${country}`);
            setMessage('Settings saved successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Failed to update profile', error);
            setMessage('Failed to save settings.');
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;

    return (
        <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Settings</h1>
                <Link href="/dashboard" style={{ color: '#0070f3', textDecoration: 'none' }}>Back to Dashboard</Link>
            </header>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label htmlFor="country" style={{ fontWeight: 'bold' }}>Country / Region</label>
                    <select
                        id="country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' }}
                    >
                        <option value="US">United States (US)</option>
                        <option value="IN">India (IN)</option>
                        <option value="GB">United Kingdom (GB)</option>
                        <option value="CA">Canada (CA)</option>
                        <option value="AU">Australia (AU)</option>
                    </select>
                    <p style={{ fontSize: '0.875rem', color: '#666' }}>This affects subscription costs and content availability.</p>
                </div>

                <button
                    type="submit"
                    style={{
                        padding: '0.75rem',
                        backgroundColor: '#0070f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '1rem',
                        cursor: 'pointer'
                    }}
                >
                    Save Changes
                </button>

                {message && (
                    <div style={{
                        padding: '1rem',
                        borderRadius: '4px',
                        backgroundColor: message.includes('Failed') ? '#fff1f0' : '#f6ffed',
                        color: message.includes('Failed') ? '#cf1322' : '#389e0d',
                        border: `1px solid ${message.includes('Failed') ? '#ffa39e' : '#b7eb8f'}`
                    }}>
                        {message}
                    </div>
                )}
            </form>
        </div>
    );
}
