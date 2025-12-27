import React, { useState } from 'react';
import { Star } from 'lucide-react';
import styles from './StarRating.module.css';

interface StarRatingProps {
    rating: number; // 0-10
    onRatingChange?: (rating: number) => void;
    readonly?: boolean;
    size?: number;
}

export default function StarRating({ rating, onRatingChange, readonly = false, size = 16 }: StarRatingProps) {
    const [hoverRating, setHoverRating] = useState<number | null>(null);

    // Convert 1-10 scale to 1-5 stars for display
    const displayRating = Math.round(rating / 2);

    const handleMouseEnter = (index: number) => {
        if (!readonly) {
            setHoverRating(index);
        }
    };

    const handleMouseLeave = () => {
        setHoverRating(null);
    };

    const handleClick = (index: number) => {
        if (!readonly && onRatingChange) {
            onRatingChange(index * 2);
        }
    };

    return (
        <div className={styles.starContainer} onMouseLeave={handleMouseLeave}>
            {[1, 2, 3, 4, 5].map((index) => {
                const isFilled = (hoverRating !== null ? hoverRating : displayRating) >= index;

                return (
                    <div
                        key={index}
                        className={`${styles.starWrapper} ${readonly ? styles.readonly : ''}`}
                        onMouseEnter={() => handleMouseEnter(index)}
                        onClick={() => handleClick(index)}
                    >
                        <Star
                            size={size}
                            className={isFilled ? styles.starFilled : styles.starEmpty}
                            fill={isFilled ? "#fbbf24" : "none"}
                        />
                    </div>
                );
            })}
        </div>
    );
}
