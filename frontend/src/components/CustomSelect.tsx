'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './CustomSelect.module.css';

interface Option {
    value: string | number;
    label: string;
}

interface CustomSelectProps {
    value: string | number;
    options: Option[];
    onChange: (value: string | number) => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
}

export default function CustomSelect({
    value,
    options,
    onChange,
    placeholder = 'Select an option',
    disabled = false,
    required = false
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    // Handle clicking outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string | number) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div className={styles.selectContainer} ref={containerRef}>
            <button
                type="button"
                className={`${styles.selectButton} ${isOpen ? styles.active : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className={!selectedOption ? styles.placeholder : ''}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={18} className={`${styles.icon} ${isOpen ? styles.open : ''}`} />
            </button>

            {isOpen && (
                <ul className={styles.optionsList} role="listbox">
                    {options.map((option) => (
                        <li
                            key={option.value}
                            className={`${styles.option} ${option.value === value ? styles.selected : ''}`}
                            onClick={() => handleSelect(option.value)}
                            role="option"
                            aria-selected={option.value === value}
                        >
                            {option.label}
                        </li>
                    ))}
                </ul>
            )}

            {/* Hidden input for form validation compatibility if needed */}
            {required && (
                <input
                    type="text"
                    value={String(value || '')}
                    required={required}
                    style={{ position: 'absolute', opacity: 0, height: 0, padding: 0 }}
                    readOnly
                />
            )}
        </div>
    );
}
