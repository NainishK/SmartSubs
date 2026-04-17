import {
    Clapperboard,
    CalendarClock,
    CheckCircle,
    PauseCircle,
    XCircle,
    Plus,
    Layers,
} from 'lucide-react';

export interface StatusConfig {
    label: string;
    color: string;
    bgLight: string;
    bgDark: string;
    icon: typeof Clapperboard;
}

/**
 * Centralized status color configuration.
 * Single source of truth for all status-related theming across the app.
 */
export const STATUS_COLORS: Record<string, StatusConfig> = {
    watching: {
        label: 'Watching',
        color: '#3b82f6',
        bgLight: 'rgba(59,130,246,0.1)',
        bgDark: 'rgba(59,130,246,0.15)',
        icon: Clapperboard,
    },
    plan_to_watch: {
        label: 'Plan to Watch',
        color: '#f59e0b',
        bgLight: 'rgba(245,158,11,0.1)',
        bgDark: 'rgba(245,158,11,0.15)',
        icon: CalendarClock,
    },
    watched: {
        label: 'Watched',
        color: '#10b981',
        bgLight: 'rgba(16,185,129,0.1)',
        bgDark: 'rgba(16,185,129,0.15)',
        icon: CheckCircle,
    },
    paused: {
        label: 'Paused',
        color: '#6b7280',
        bgLight: 'rgba(107,114,128,0.1)',
        bgDark: 'rgba(107,114,128,0.15)',
        icon: PauseCircle,
    },
    dropped: {
        label: 'Dropped',
        color: '#ef4444',
        bgLight: 'rgba(239,68,68,0.1)',
        bgDark: 'rgba(239,68,68,0.15)',
        icon: XCircle,
    },
};

/** Get status config with a safe fallback for unknown/new statuses */
export function getStatusConfig(status: string): StatusConfig {
    return STATUS_COLORS[status] || {
        label: 'Add',
        color: '#2563eb',
        bgLight: 'rgba(37,99,235,0.1)',
        bgDark: 'rgba(37,99,235,0.15)',
        icon: Plus,
    };
}

/** "All" tab config — uses default primary blue */
export const ALL_TAB_CONFIG = {
    label: 'All',
    color: '#6366f1',
    icon: Layers,
};

/**
 * Build a colorMap object for use with CustomSelect's colorMap prop.
 * Maps status value -> hex color string.
 */
export const STATUS_COLOR_MAP: Record<string, string> = Object.fromEntries(
    Object.entries(STATUS_COLORS).map(([key, config]) => [key, config.color])
);
