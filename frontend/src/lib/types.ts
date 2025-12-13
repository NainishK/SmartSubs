export interface Subscription {
    id: number;
    service_name: string;
    cost: number;
    currency: string;
    billing_cycle: string;
    start_date: string;
    next_billing_date: string;
    is_active: boolean;
}

export interface WatchlistItem {
    id: number;
    tmdb_id: number;
    title: string;
    media_type: string;
    poster_path?: string;
    status: string;
    vote_average?: number;
    overview?: string;
    user_rating?: number; // 1-10 (mapped to stars)
}

export interface Recommendation {
    type: 'watch_now' | 'cancel' | 'subscribe' | 'similar_content';
    service_name: string;
    items: string[];
    reason: string;
    cost: number;
    savings: number;
    score: number;
    tmdb_id?: number;
    media_type?: string;
    poster_path?: string;
    vote_average?: number;
    overview?: string;
}

export interface Service {
    id: number;
    name: string;
    logo_url?: string;
}

export interface Plan {
    id: number;
    name: string;
    cost: number;
    currency: string;
}

export interface AIRecommendation {
    title: string;
    reason: string;
    service: string;
}
