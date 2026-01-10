import React, { useState } from 'react';
import { Star } from 'lucide-react';
import styles from './StarRating.module.css';

interface StarRatingProps {
    rating: number; // 0-10
    onRatingChange?: (rating: number) => void;
    readonly?: boolean;
    size?: number;
    maxStars?: 5 | 10;
}

export default function StarRating({ rating, onRatingChange, readonly = false, size = 16, maxStars = 5 }: StarRatingProps) {
    const [hoverRating, setHoverRating] = useState<number | null>(null);

    // If maxStars is 5, scale down (0-10 -> 0-5). If 10, usage is 1:1.
    const displayRating = maxStars === 5 ? Math.round(rating / 2) : rating;

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
            // Index is 1-based. If maxStars=5, index 1 = rating 2. If maxStars=10, index 1 = rating 1.
            const newRating = maxStars === 5 ? index * 2 : index;
            onRatingChange(newRating);
        }
    };

    return (
        <div className={`${styles.starContainer} ${maxStars === 10 ? styles.tenStars : ''}`} onMouseLeave={handleMouseLeave}>
            {Array.from({ length: maxStars }, (_, i) => i + 1).map((index) => {
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
