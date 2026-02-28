import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Plus } from 'lucide-react';
import styles from './CustomSelect.module.css';

interface Option {
    value: string | number;
    label: string | React.ReactNode;
}

interface CustomSelectProps {
    value: string | number;
    options: Option[];
    onChange: (value: string | number) => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    className?: string;
    forceLightMode?: boolean;
    searchable?: boolean;
    onCustomAdd?: (name: string) => void;
}

export default function CustomSelect({
    value,
    options,
    onChange,
    placeholder = 'Select an option',
    disabled = false,
    required = false,
    className = '',
    forceLightMode = false,
    searchable = false,
    onCustomAdd,
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [dropdownStyles, setDropdownStyles] = useState<{ top: number, left: number, width: number }>({ top: 0, left: 0, width: 0 });

    const selectedOption = options.find(opt => opt.value === value);

    // Filter options when searchable
    const filteredOptions = searchable && searchQuery
        ? options.filter(opt => {
            const label = typeof opt.label === 'string' ? opt.label : String(opt.label);
            return label.toLowerCase().includes(searchQuery.toLowerCase());
        })
        : options;

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

    // Focus input when opening in searchable mode
    useEffect(() => {
        if (isOpen && searchable && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen, searchable]);

    // Handle clicking outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node) &&
                listRef.current &&
                !listRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
                if (searchable) setSearchQuery('');
            }
        };

        const handleScroll = (event: Event) => {
            // Don't close if scrolling inside the dropdown list
            if (listRef.current && listRef.current.contains(event.target as Node)) {
                return;
            }
            if (isOpen) setIsOpen(false);
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScroll, true);
            window.addEventListener('resize', () => { if (isOpen) setIsOpen(false); });
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', () => { if (isOpen) setIsOpen(false); });
        };
    }, [isOpen, searchable]);

    const handleSelect = (optionValue: string | number) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleCustomAdd = () => {
        if (onCustomAdd && searchQuery.trim()) {
            onCustomAdd(searchQuery.trim());
            setIsOpen(false);
            setSearchQuery('');
        }
    };

    const showCustomOption = searchable && searchQuery.trim() && filteredOptions.length === 0 && onCustomAdd;

    return (
        <div
            className={`${styles.selectContainer} ${className} ${isOpen ? styles.containerOpen : ''} ${forceLightMode ? styles.lightTheme : ''}`}
            ref={containerRef}
        >
            {searchable ? (
                <div
                    className={`${styles.searchInputWrapper} ${isOpen ? styles.active : ''}`}
                    onClick={() => !disabled && setIsOpen(true)}
                >
                    <Search size={16} className={styles.searchIcon} />
                    <input
                        ref={inputRef}
                        type="text"
                        className={styles.searchInput}
                        placeholder={placeholder}
                        value={isOpen ? searchQuery : (selectedOption ? String(selectedOption.label) : '')}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            if (!isOpen) setIsOpen(true);
                        }}
                        onFocus={() => {
                            if (!isOpen) setIsOpen(true);
                            if (selectedOption) setSearchQuery('');
                        }}
                        disabled={disabled}
                        autoComplete="off"
                    />
                    <ChevronDown size={16} className={`${styles.icon} ${isOpen ? styles.open : ''}`} />
                </div>
            ) : (
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
            )}

            {isOpen && createPortal(
                <ul
                    className={`${styles.optionsList} ${forceLightMode ? styles.lightTheme : ''}`}
                    role="listbox"
                    ref={listRef}
                    style={{
                        position: 'absolute',
                        top: dropdownStyles.top,
                        left: dropdownStyles.left,
                        minWidth: dropdownStyles.width,
                        width: 'max-content',
                        zIndex: 9999
                    }}
                >
                    {filteredOptions.map((option) => (
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
                    {showCustomOption && (
                        <li
                            className={`${styles.option} ${styles.customOption}`}
                            onClick={handleCustomAdd}
                        >
                            <Plus size={16} />
                            <span>Add &ldquo;{searchQuery.trim()}&rdquo; as custom</span>
                        </li>
                    )}
                    {searchable && searchQuery && filteredOptions.length === 0 && !onCustomAdd && (
                        <li className={`${styles.option} ${styles.noResults}`}>
                            No results found
                        </li>
                    )}
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
