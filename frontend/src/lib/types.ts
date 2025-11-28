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
    title: string;
    media_type: string;
    poster_path?: string;
    status: string;
}

export interface Recommendation {
    type: 'watch_now' | 'cancel' | 'subscribe' | 'similar_content';
    service_name: string;
    items: string[];
    reason: string;
    cost: number;
    savings: number;
    score: number;
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
