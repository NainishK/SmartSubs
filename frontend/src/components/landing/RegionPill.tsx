'use client';

import { useState } from 'react';
import styles from './RegionPill.module.css';

interface RegionPillProps {
    region: string;
    onChange: (region: string) => void;
}

const SUPPORTED_REGIONS = [
    { code: 'IN', label: '🇮🇳 India', flag: '🇮🇳' },
    { code: 'US', label: '🇺🇸 United States', flag: '🇺🇸' },
];

export default function RegionPill({ region, onChange }: RegionPillProps) {
    const [open, setOpen] = useState(false);
    const current = SUPPORTED_REGIONS.find(r => r.code === region) || SUPPORTED_REGIONS[1];

    return (
        <div className={styles.wrapper}>
            <button
                className={styles.pill}
                onClick={() => setOpen(o => !o)}
                title="Change region"
            >
                <span className={styles.fullLabel}>{current.label}</span>
                <span className={styles.flagLabel}>{current.flag}</span>
                <span className={styles.caret}>▾</span>
            </button>
            {open && (
                <div className={styles.dropdown}>
                    {SUPPORTED_REGIONS.map(r => (
                        <button
                            key={r.code}
                            className={`${styles.option} ${r.code === region ? styles.active : ''}`}
                            onClick={() => { onChange(r.code); setOpen(false); }}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
