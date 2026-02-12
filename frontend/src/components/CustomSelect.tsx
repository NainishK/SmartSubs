import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    className?: string;
}

export default function CustomSelect({
    value,
    options,
    onChange,
    placeholder = 'Select an option',
    disabled = false,
    required = false,
    className = ''
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dropdownStyles, setDropdownStyles] = useState<{ top: number, left: number, width: number }>({ top: 0, left: 0, width: 0 });

    const selectedOption = options.find(opt => opt.value === value);

    // Update position when opening
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDropdownStyles({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    }, [isOpen]);

    // Handle clicking outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleScroll = () => {
            if (isOpen) setIsOpen(false); // Close on scroll to prevent detached dropdowns
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [isOpen]);

    const handleSelect = (optionValue: string | number) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div
            className={`${styles.selectContainer} ${className} ${isOpen ? styles.containerOpen : ''}`}
            ref={containerRef}
        >
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

            {isOpen && createPortal(
                <ul
                    className={styles.optionsList}
                    role="listbox"
                    style={{
                        position: 'absolute',
                        top: dropdownStyles.top,
                        left: dropdownStyles.left,
                        minWidth: dropdownStyles.width,
                        width: 'max-content',
                        zIndex: 9999 // Portal ensures high z-index
                    }}
                >
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
                </ul>,
                document.body
            )}

            {/* Hidden input for form validation compatibility */}
            {required && (
                <input
                    type="text"
                    value={String(value || '')}
                    required={required}
                    style={{
                        position: 'absolute',
                        opacity: 0,
                        width: '1px',
                        height: '1px',
                        bottom: 0,
                        left: 0,
                        zIndex: -1,
                        pointerEvents: 'none',
                        clip: 'rect(0, 0, 0, 0)'
                    }}
                    readOnly
                    autoComplete="off"
                    tabIndex={-1}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    aria-hidden="true"
                />
            )}
        </div>
    );
}
