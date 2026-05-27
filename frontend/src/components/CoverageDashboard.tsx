'use client';

import React, { useEffect, useState } from 'react';
import styles from './CoverageDashboard.module.css';
import { ServiceIcon } from './ServiceIcon';
import { BarChart2, Clock, AlertTriangle, Film, Tv, Zap, Play, Search, RefreshCw, HelpCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import api from '@/lib/api';
import MediaCard from './MediaCard';

// ---- Types ----
interface BreakdownItem {
    count: number;
    est_hours: number;
}

interface ServiceCoverage {
    name: string;
    cost: number;
    billing_cycle: string;
    logo_url: string | null;
    coverage_pct: number;
    value_score: number;
    type_count: number;
    total_covered: number;
    total_hours: number;
    cost_per_title: number | null;
    cost_per_hour: number | null;
    breakdown: {
        movie: BreakdownItem;
        tv: BreakdownItem;
        anime: BreakdownItem;
        other: BreakdownItem;
    };
}

interface OrphanedItem {
    tmdb_id: number;
    dbId: number;
    title: string;
    media_type: string;
    poster_path: string | null;
    vote_average?: number;
    overview?: string;
    status: string;
    est_hours: number;
    content_type: string;
    suggested_service: string | null;
    original_language?: string;
    genre_ids?: number[];
}

interface SuggestedService {
    name: string;
    logo_url: string | null;
    count: number;
    est_hours: number;
    coverage_pct: number;
    breakdown: {
        movie: { count: number; est_hours: number };
        tv:    { count: number; est_hours: number };
        anime: { count: number; est_hours: number };
        other: { count: number; est_hours: number };
    };
    titles: string[];
    cheapest_plan: { cost: number; currency: string; billing_cycle: string } | null;
    value_score: number;
    cost_per_title: number | null;
    cost_per_hour: number | null;
}

interface CoverageData {
    services: ServiceCoverage[];
    orphaned_items: OrphanedItem[];
    suggested_services: SuggestedService[];
    summary: {
        total_monthly_cost: number;
        total_covered: number;
        total_watchlist: number;
        overall_coverage_pct: number;
        total_covered_hours: number;
        most_valuable_service: string | null;
        least_used_service: string | null;
    };
}

interface CoverageDashboardProps {
    userCountry: string;
}

// ---- Content type icon config ----
const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
    movie: {
        label: 'Movies',
        icon: <Film size={12} />,
        color: '#3b82f6',
        bg: 'rgba(59,130,246,0.12)',
    },
    tv: {
        label: 'TV',
        icon: <Tv size={12} />,
        color: '#8b5cf6',
        bg: 'rgba(139,92,246,0.12)',
    },
    anime: {
        label: 'Anime',
        icon: <Zap size={12} />,
        color: '#ec4899',
        bg: 'rgba(236,72,153,0.12)',
    },
    other: {
        label: 'Other',
        icon: <Play size={12} />,
        color: '#94a3b8',
        bg: 'rgba(148,163,184,0.12)',
    },
};

function CoverageBar({ pct }: { pct: number }) {
    const color =
        pct >= 50 ? '#22c55e' :
        pct >= 20 ? '#f59e0b' : '#ef4444';

    return (
        <div className={styles.coverageBarTrack}>
            <div
                className={styles.coverageBarFill}
                style={{ width: `${Math.min(pct, 100)}%`, background: color }}
            />
        </div>
    );
}

function formatHrs(hrs: number): string {
    if (hrs < 1) return `${Math.round(hrs * 60)}m`;
    return `~${hrs.toFixed(hrs >= 10 ? 0 : 1)}h`;
}

function parseGenreIds(ids: any): number[] {
    if (!ids) return [];
    if (Array.isArray(ids)) return ids;
    if (typeof ids === 'string') {
        try {
            const parsed = JSON.parse(ids);
            if (Array.isArray(parsed)) return parsed.map(Number);
        } catch {
            // fallback
        }
        return ids
            .replace(/[\[\]]/g, '')
            .split(',')
            .map((s: string) => Number(s.trim()))
            .filter((n: number) => !isNaN(n));
    }
    return [];
}

export default function CoverageDashboard({ userCountry }: CoverageDashboardProps) {
    const [data, setData] = useState<CoverageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCoverage = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/subscriptions/coverage');
            setData(res.data);
        } catch (e: any) {
            const msg = e.response?.data?.detail || e.message || 'Could not load coverage data';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCoverage(); }, []);

    if (loading) return (
        <div className={styles.skeletonWrap}>
            <div className={styles.skeletonStrip} />
            <div className={styles.skeletonGrid}>
                {[1, 2, 3].map(i => <div key={i} className={styles.skeletonCard} />)}
            </div>
        </div>
    );

    if (error) return (
        <div className={styles.errorState}>
            <AlertTriangle size={20} />
            <span>{error}</span>
            <button onClick={fetchCoverage} className={styles.retryBtn}>
                <RefreshCw size={14} /> Retry
            </button>
        </div>
    );

    if (!data || data.summary.total_watchlist === 0) return (
        <div className={styles.emptyState}>
            <BarChart2 size={40} style={{ opacity: 0.25 }} />
            <p>Add items to your watchlist to see how well your subscriptions cover them.</p>
        </div>
    );

    if (data.services.length === 0) return (
        <div className={styles.emptyState}>
            <BarChart2 size={40} style={{ opacity: 0.25 }} />
            <p>Add active OTT subscriptions to see your coverage breakdown.</p>
        </div>
    );

    const { summary, services, orphaned_items } = data;
    const uncoveredHours = orphaned_items.reduce((sum, i) => sum + i.est_hours, 0);

    const handleRemove = async (dbId: number, title: string) => {
        if (!window.confirm(`Are you sure you want to remove "${title}" from your watchlist?`)) return;
        try {
            await api.delete(`/watchlist/${dbId}`);
            fetchCoverage();
        } catch (e) {
            console.error("Failed to remove item", e);
        }
    };

    return (
        <div className={styles.wrapper}>

            {/* ── Summary Strip ── */}
            <div className={styles.summaryStrip}>
                {/* Card 1: Coverage */}
                <div className={styles.summaryCard}>
                    <div className={styles.summaryIcon} style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
                        <BarChart2 size={20} />
                    </div>
                    <div className={styles.summaryBody}>
                        <div className={styles.summaryValue}>
                            <span className={styles.summaryBig}>{summary.overall_coverage_pct}%</span>
                            <span className={styles.summaryLabel}>Covered</span>
                        </div>
                        <p className={styles.summarySubtext}>
                            {summary.total_covered} of {summary.total_watchlist} titles
                            &nbsp;·&nbsp; {formatHrs(summary.total_covered_hours)} accessible
                        </p>
                        <div className={styles.summaryBar}>
                            <div
                                className={styles.summaryBarFill}
                                style={{ width: `${summary.overall_coverage_pct}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Card 2: Spend */}
                <div className={styles.summaryCard}>
                    <div className={styles.summaryIcon} style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                        <Clock size={20} />
                    </div>
                    <div className={styles.summaryBody}>
                        <div className={styles.summaryValue}>
                            <span className={styles.summaryBig}>
                                {formatCurrency(summary.total_monthly_cost, userCountry)}
                            </span>
                            <span className={styles.summaryLabel}>/mo</span>
                        </div>
                        <p className={styles.summarySubtext}>
                            {formatHrs(summary.total_covered_hours)} of content accessible
                        </p>
                        {summary.total_covered_hours > 0 && (
                            <p className={styles.summaryHighlight}>
                                {formatCurrency(
                                    Math.round((summary.total_monthly_cost / summary.total_covered_hours) * 100) / 100,
                                    userCountry
                                )}/hour value
                            </p>
                        )}
                    </div>
                </div>

                {/* Card 3: Uncovered */}
                <div className={`${styles.summaryCard} ${orphaned_items.length > 0 ? styles.summaryCardWarn : ''}`}>
                    <div className={styles.summaryIcon} style={{
                        background: orphaned_items.length > 0 ? 'rgba(245,158,11,0.12)' : 'rgba(148,163,184,0.12)',
                        color: orphaned_items.length > 0 ? '#f59e0b' : '#94a3b8'
                    }}>
                        <AlertTriangle size={20} />
                    </div>
                    <div className={styles.summaryBody}>
                        <div className={styles.summaryValue}>
                            <span className={styles.summaryBig}>{orphaned_items.length}</span>
                            <span className={styles.summaryLabel}>Missing</span>
                        </div>
                        <p className={styles.summarySubtext}>
                            {formatHrs(uncoveredHours)} of content not covered
                        </p>
                        {orphaned_items.length > 0 && (
                            <p className={styles.summaryHighlight} style={{ color: '#f59e0b' }}>
                                Not available on active subs
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Services Grid ── */}
            <div className={styles.servicesGrid}>
                {services.map(svc => {
                    const isUnused = svc.total_covered === 0;

                    return (
                        <div
                            key={svc.name}
                            className={`${styles.serviceCard} ${isUnused ? styles.serviceCardUnused : ''}`}
                        >
                            {/* Card Header */}
                            <div className={styles.serviceCardHeader}>
                                <div className={styles.serviceIdentity}>
                                    {svc.logo_url ? (
                                        <img
                                            src={svc.logo_url}
                                            alt={svc.name}
                                            className={styles.serviceLogo}
                                        />
                                    ) : (
                                        <div
                                            className={styles.serviceLogoFallback}
                                            style={{ background: '#4f46e5' }}
                                        >
                                            {svc.name.substring(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <h4 className={styles.serviceName}>{svc.name}</h4>
                                        <p className={styles.serviceCost}>
                                            <span>{formatCurrency(svc.cost, userCountry)}</span>
                                            {svc.billing_cycle === 'yearly' ? (
                                                <span className={styles.yearlyBadge}>Yearly</span>
                                            ) : (
                                                <span className={styles.monthlyBadge}>Monthly</span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {isUnused ? (
                                    <span className={styles.unusedBadge}>0%</span>
                                ) : (
                                    <span className={styles.infoTooltipContainer} style={{ marginLeft: 0 }}>
                                        <span
                                            className={styles.coveragePctBadge}
                                            style={{
                                                color:
                                                    svc.coverage_pct >= 50 ? '#22c55e' :
                                                    svc.coverage_pct >= 20 ? '#f59e0b' : '#ef4444',
                                                borderColor:
                                                    svc.coverage_pct >= 50 ? 'rgba(34,197,94,0.3)' :
                                                    svc.coverage_pct >= 20 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)',
                                                background:
                                                    svc.coverage_pct >= 50 ? 'rgba(34,197,94,0.06)' :
                                                    svc.coverage_pct >= 20 ? 'rgba(245,158,11,0.06)' : 'rgba(239,68,68,0.06)'
                                            }}
                                        >
                                            {svc.coverage_pct}%
                                        </span>
                                        <span className={styles.infoTooltip} style={{ right: 0, left: 'auto', transform: 'none' }}>
                                            <strong>Watchlist Coverage</strong><br />
                                            {svc.total_covered} of your {summary.total_watchlist} watchlist titles are available on {svc.name}.
                                        </span>
                                    </span>
                                )}
                            </div>

                            {/* Coverage Visual Bar */}
                            {!isUnused && (
                                <>
                                    <CoverageBar pct={svc.value_score} />
                                    <p className={styles.coverageCaption}>
                                        <span>Value Score: <strong>{svc.value_score} / 100</strong></span>
                                        <span className={styles.infoTooltipContainer}>
                                            <HelpCircle size={13} className={styles.infoIcon} />
                                            <span className={styles.infoTooltip}>
                                                <strong>Value Score Formula:</strong><br />
                                                Hours of content (55%), Watchlist Coverage (25%), Content Variety (20%), minus a cost penalty. Services with 200+ hours of your watchlist content score well regardless of platform size.
                                            </span>
                                        </span>
                                    </p>
                                </>
                            )}

                            {/* Type Breakdown */}
                            {!isUnused && (
                                <div className={styles.typeBreakdown}>
                                    {(['movie', 'tv', 'anime', 'other'] as const).map(ct => {
                                        const bd = svc.breakdown[ct];
                                        if (bd.count === 0) return null;
                                        const meta = TYPE_META[ct];
                                        return (
                                            <div key={ct} className={styles.typeRow}>
                                                <span
                                                    className={styles.typeIconChip}
                                                    style={{ color: meta.color, background: meta.bg }}
                                                >
                                                    {meta.icon}
                                                </span>
                                                <span className={styles.typeLabel}>
                                                    {bd.count} {meta.label}
                                                </span>
                                                <span className={styles.typeHours}>
                                                    {formatHrs(bd.est_hours)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    <div className={styles.typeDivider} />
                                    <div className={styles.typeRowTotal}>
                                        <span className={styles.typeTotalLabel}>{svc.total_covered} titles</span>
                                        <span className={styles.typeTotalHours}>{formatHrs(svc.total_hours)} total</span>
                                    </div>
                                </div>
                            )}

                            {/* Efficiency Footer */}
                            {!isUnused && (svc.cost_per_title !== null || svc.cost_per_hour !== null) && (
                                <div className={styles.efficiencyRow}>
                                    {svc.cost_per_title !== null && (
                                        <span className={styles.efficiencyPill}>
                                            {formatCurrency(svc.cost_per_title, userCountry)}/title
                                        </span>
                                    )}
                                    {svc.cost_per_hour !== null && (
                                        <span className={styles.efficiencyPill}>
                                            {formatCurrency(svc.cost_per_hour, userCountry)}/hr
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Consider Adding ── */}
            {data.suggested_services && data.suggested_services.length > 0 && (
                <div className={styles.section}>
                    <h3 className={styles.sectionHeading}>
                        <Search size={16} />
                        Consider Adding
                    </h3>
                    <p className={styles.sectionSubtext}>
                        These services cover the most unwatched titles from your watchlist that you don&apos;t currently subscribe to.
                    </p>
                    <div className={styles.suggestedGrid}>
                        {data.suggested_services.slice(0, 4).map(svc => (
                            <div key={svc.name} className={styles.serviceCard}>

                                {/* Header — identical to subscribed card */}
                                <div className={styles.serviceCardHeader}>
                                    <div className={styles.serviceIdentity}>
                                        {svc.logo_url ? (
                                            <img src={svc.logo_url} alt={svc.name} className={styles.serviceLogo} />
                                        ) : (
                                            <div className={styles.serviceLogoFallback} style={{ background: '#4f46e5' }}>
                                                {svc.name.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <h4 className={styles.serviceName}>{svc.name}</h4>
                                            <p className={styles.serviceCost}>
                                                {svc.cheapest_plan ? (
                                                    <>
                                                        <span>{formatCurrency(svc.cheapest_plan.cost, userCountry)}</span>
                                                        {svc.cheapest_plan.billing_cycle === 'yearly' ? (
                                                            <span className={styles.yearlyBadge}>Yearly</span>
                                                        ) : (
                                                            <span className={styles.monthlyBadge}>Monthly</span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>Price unavailable</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={styles.infoTooltipContainer} style={{ marginLeft: 0 }}>
                                        <span
                                            className={styles.coveragePctBadge}
                                            style={{
                                                color: svc.coverage_pct >= 20 ? '#f59e0b' : '#ef4444',
                                                borderColor: svc.coverage_pct >= 20 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)',
                                                background: svc.coverage_pct >= 20 ? 'rgba(245,158,11,0.06)' : 'rgba(239,68,68,0.06)'
                                            }}
                                        >
                                            {svc.coverage_pct}%
                                        </span>
                                        <span className={styles.infoTooltip} style={{ right: 0, left: 'auto', transform: 'none' }}>
                                            <strong>Watchlist Coverage</strong><br />
                                            {svc.count} of your {summary.total_watchlist} watchlist titles are on {svc.name}.
                                        </span>
                                    </span>
                                </div>

                                {/* Progress bar + Value Score */}
                                <CoverageBar pct={svc.value_score} />
                                <p className={styles.coverageCaption}>
                                    <span>Value Score: <strong>{svc.value_score} / 100</strong></span>
                                    <span className={styles.infoTooltipContainer}>
                                        <HelpCircle size={13} className={styles.infoIcon} />
                                        <span className={styles.infoTooltip}>
                                            <strong>Projected Value Score</strong><br />
                                            Estimated based on hours of content, watchlist coverage, and the cheapest available plan cost.
                                        </span>
                                    </span>
                                </p>

                                {/* Type breakdown */}
                                <div className={styles.typeBreakdown}>
                                    {(['movie', 'tv', 'anime', 'other'] as const).map(ct => {
                                        const bd = svc.breakdown[ct];
                                        if (!bd || bd.count === 0) return null;
                                        const meta = TYPE_META[ct];
                                        return (
                                            <div key={ct} className={styles.typeRow}>
                                                <span className={styles.typeIconChip}
                                                    style={{ color: meta.color, background: meta.bg }}>
                                                    {meta.icon}
                                                </span>
                                                <span className={styles.typeLabel}>{bd.count} {meta.label}</span>
                                                <span className={styles.typeHours}>{formatHrs(bd.est_hours)}</span>
                                            </div>
                                        );
                                    })}
                                    <div className={styles.typeDivider} />
                                    <div className={styles.typeRowTotal}>
                                        <span className={styles.typeTotalLabel}>{svc.count} titles</span>
                                        <span className={styles.typeTotalHours}>{formatHrs(svc.est_hours)} total</span>
                                    </div>
                                </div>

                                {/* Efficiency pills */}
                                {(svc.cost_per_title !== null || svc.cost_per_hour !== null) && (
                                    <div className={styles.efficiencyRow}>
                                        {svc.cost_per_title !== null && (
                                            <span className={styles.efficiencyPill}>
                                                {formatCurrency(svc.cost_per_title, userCountry)}/title
                                            </span>
                                        )}
                                        {svc.cost_per_hour !== null && (
                                            <span className={styles.efficiencyPill}>
                                                {formatCurrency(svc.cost_per_hour, userCountry)}/hr
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Available titles */}
                                {svc.titles.length > 0 && (
                                    <div className={styles.suggestedTitles}>
                                        {svc.titles.map(t => (
                                            <span key={t} className={styles.suggestedTitleTag}>{t}</span>
                                        ))}
                                        {svc.count > svc.titles.length && (
                                            <span className={styles.suggestedTitleMore}>+{svc.count - svc.titles.length} more</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
