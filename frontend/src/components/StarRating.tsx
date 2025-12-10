import React, { useState } from 'react';
import styles from './StarRating.module.css';

interface StarRatingProps {
    rating: number; // 1-10 (but we show 5 stars)
    onRate: (rating: number) => void;
    editable?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, onRate, editable = false }) => {
    const [hoverRating, setHoverRating] = useState(0);

    const displayRating = hoverRating || Math.round(rating / 2); // Map 10 -> 5

    const handleClick = (star: number) => {
        if (!editable) return;
        onRate(star * 2); // Map 5 -> 10
    };

    return (
        <div className={styles.container}>
            {[1, 2, 3, 4, 5].map((star) => (
                <span
                    key={star}
                    className={`${styles.star} ${star <= displayRating ? styles.filled : ''} ${editable ? styles.editable : ''}`}
                    onMouseEnter={() => editable && setHoverRating(star)}
                    onMouseLeave={() => editable && setHoverRating(0)}
                    onClick={() => handleClick(star)}
                >
                    ★
                </span>
            ))}
        </div>
    );
};

export default StarRating;
