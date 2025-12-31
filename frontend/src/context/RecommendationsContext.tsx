'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';
import { Recommendation } from '@/lib/types';

interface RecommendationsContextType {
    dashboardRecs: Recommendation[];
    similarRecs: Recommendation[];
    loadingDashboard: boolean;
    loadingSimilar: boolean;
    refreshRecommendations: (force?: boolean) => Promise<void>;
    fetchSimilarData: (force?: boolean) => Promise<void>;
    lastUpdated: Date | null;
}

const RecommendationsContext = createContext<RecommendationsContextType | undefined>(undefined);

export function RecommendationsProvider({ children }: { children: ReactNode }) {
    const [dashboardRecs, setDashboardRecs] = useState<Recommendation[]>([]);
    const [similarRecs, setSimilarRecs] = useState<Recommendation[]>([]);
    const [loadingDashboard, setLoadingDashboard] = useState(true);
    const [loadingSimilar, setLoadingSimilar] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Fetch data on mount if empty
    useEffect(() => {
        if (dashboardRecs.length === 0) {
            fetchDashboardData();
        }
        if (similarRecs.length === 0) {
            fetchSimilarData();
        }
    }, []);

    const fetchDashboardData = async () => {
        setLoadingDashboard(true);
        try {
            // Add timestamp for cache-busting and silent auth to prevent accidental logouts
            // @ts-ignore
            const response = await api.get(`/recommendations/dashboard?t=${Date.now()}`, { _silentAuth: true });
            setDashboardRecs(response.data);
        } catch (error) {
            console.error('Failed to fetch dashboard recommendations', error);
        } finally {
            setLoadingDashboard(false);
        }
    };

    const fetchSimilarData = async (force: boolean = false) => {
        setLoadingSimilar(true);
        try {
            // Add timestamp for cache-busting and silent auth
            // @ts-ignore
            const response = await api.get(`/recommendations/similar?t=${Date.now()}&force_refresh=${force}`, { _silentAuth: true });
            setSimilarRecs(response.data);
        } catch (error) {
            console.error('Failed to fetch similar recommendations', error);
        } finally {
            setLoadingSimilar(false);
        }
    };

    const refreshRecommendations = async (force: boolean = false) => {
        setLoadingDashboard(true);
        setLoadingSimilar(true);

        try {
            // 1. Trigger backend refresh (Synchronous POST)
            // Note: POST /refresh endpoint is always forceful check backend
            await api.post('/recommendations/refresh');

            // 2. Fetch fresh data immediately (since POST is synchronous)
            await Promise.all([fetchDashboardData(), fetchSimilarData(force)]);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to refresh recommendations', error);
        } finally {
            setLoadingDashboard(false);
            setLoadingSimilar(false);
        }
    };

    return (
        <RecommendationsContext.Provider value={{
            dashboardRecs,
            similarRecs,
            loadingDashboard,
            loadingSimilar,
            refreshRecommendations,
            fetchSimilarData,
            lastUpdated
        }}>
            {children}
        </RecommendationsContext.Provider>
    );
}

export function useRecommendations() {
    const context = useContext(RecommendationsContext);
    if (context === undefined) {
        throw new Error('useRecommendations must be used within a RecommendationsProvider');
    }
    return context;
}
