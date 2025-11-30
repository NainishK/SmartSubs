'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';
import { Recommendation } from '@/lib/types';

interface RecommendationsContextType {
    dashboardRecs: Recommendation[];
    similarRecs: Recommendation[];
    loadingDashboard: boolean;
    loadingSimilar: boolean;
    refreshRecommendations: () => Promise<void>;
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
            const response = await api.get('/recommendations/dashboard');
            setDashboardRecs(response.data);
        } catch (error) {
            console.error('Failed to fetch dashboard recommendations', error);
        } finally {
            setLoadingDashboard(false);
        }
    };

    const fetchSimilarData = async () => {
        setLoadingSimilar(true);
        try {
            const response = await api.get('/recommendations/similar');
            setSimilarRecs(response.data);
        } catch (error) {
            console.error('Failed to fetch similar recommendations', error);
        } finally {
            setLoadingSimilar(false);
        }
    };

    const refreshRecommendations = async () => {
        // 1. Trigger backend refresh
        try {
            await api.post('/recommendations/refresh');
            // 2. Wait a bit or poll? For simplicity, let's just re-fetch immediately 
            // but realistically the backend task takes time.
            // Better UX: Set loading, wait 2 seconds, then fetch.
            setLoadingDashboard(true);
            setLoadingSimilar(true);

            // Give backend a moment to start/finish (it's async but usually fast for dashboard)
            setTimeout(async () => {
                await Promise.all([fetchDashboardData(), fetchSimilarData()]);
                setLastUpdated(new Date());
            }, 2000);

        } catch (error) {
            console.error('Failed to refresh recommendations', error);
        }
    };

    return (
        <RecommendationsContext.Provider value={{
            dashboardRecs,
            similarRecs,
            loadingDashboard,
            loadingSimilar,
            refreshRecommendations,
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
