import Image from 'next/image';
import styles from './FeatureCarousel.module.css';

interface CarouselItem {
    src: string;
    alt: string;
}

interface FeatureCarouselProps {
    items: CarouselItem[];
    reverse?: boolean; // Option to scroll in reverse direction if desired
}

export default function FeatureCarousel({ items, reverse = false }: FeatureCarouselProps) {
    // Duplicate images 4x to ensure seamless loop even on wide screens
    // 50% translation point will be perfectly seamless
    const slides = [...items, ...items, ...items, ...items];

    return (
        <div className={styles.carouselWrapper}>
            <div
                className={`${styles.track} ${reverse ? styles.trackReverse : styles.trackNormal}`}
                style={{
                    animationDuration: `${items.length * 20}s` // Dynamic speed
                }}
            >
                {slides.map((img, index) => (
                    <div key={index} className={styles.slide}>
                        <Image
                            src={img.src}
                            alt={img.alt}
                            width={500}
                            height={300}
                            className={styles.carouselImage}
                            draggable={false}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
