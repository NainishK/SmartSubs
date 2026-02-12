'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import styles from './watchlist.module.css'; // We'll reuse/add styles here
import { genreOptions } from '@/lib/genres';

interface GenreFilterProps {
    selectedIds: number[];
    onChange: (ids: number[]) => void;
}

export default function GenreFilter({ selectedIds, onChange }: GenreFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleGenre = (id: number) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter(g => g !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const clearAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]);
        // Keep open
    };

    // Label logic
    let label = "Genre";
    if (selectedIds.length === 1) {
        const name = genreOptions.find(g => g.id === selectedIds[0])?.name;
        label = name || "Genre";
    } else if (selectedIds.length > 1) {
        label = `Genres (${selectedIds.length})`;
    }

    return (
        <div
            className={styles.genreFilterContainer}
            ref={containerRef}
            style={{ zIndex: isOpen ? 50 : 'auto' }}
        >
            <button
                className={`${styles.genreFilterBtn} ${selectedIds.length > 0 ? styles.genreFilterActive : ''} ${isOpen ? styles.genreFilterOpen : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={styles.genreLabel}>{label}</span>
                {selectedIds.length > 0 ? (
                    <div className={styles.clearBadge} onClick={clearAll} title="Clear filters">
                        <X size={14} />
                    </div>
                ) : (
                    <ChevronDown
                        size={18}
                        className={styles.genreChevron}
                        style={{
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease'
                        }}
                    />
                )}
            </button>

            {isOpen && (
                <div className={styles.genreDropdown}>
                    <div className={styles.genreList}>
                        {genreOptions.map(genre => {
                            const isSelected = selectedIds.includes(genre.id);
                            return (
                                <div
                                    key={genre.id}
                                    className={`${styles.genreOption} ${isSelected ? styles.selectedOption : ''}`}
                                    onClick={() => toggleGenre(genre.id)}
                                >
                                    <div className={styles.checkbox}>
                                        {isSelected && <Check size={12} color="white" strokeWidth={4} />}
                                    </div>
                                    <span className={styles.optionLabel}>{genre.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
