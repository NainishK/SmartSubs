import React, { useState } from 'react';

const SERVICE_DOMAINS: Record<string, string> = {
    'Netflix': 'netflix.com',
    'Amazon Prime Video': 'primevideo.com',
    'Disney Plus': 'disneyplus.com',
    'Spotify': 'spotify.com',
    'Hulu': 'hulu.com',
    'Max': 'max.com',
    'Apple TV+': 'apple.com',
    'YouTube Premium': 'youtube.com',
    'Peacock': 'peacocktv.com',
    'Paramount+': 'paramountplus.com',
    'Crunchyroll': 'crunchyroll.com'
};

const getServiceLogo = (name: string) => {
    const domain = SERVICE_DOMAINS[name];
    if (domain) {
        return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
    }

    // Fallback search for unknown services
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `https://www.google.com/s2/favicons?sz=128&domain=${slug}.com`;
};

// Auto-generate consistent pastel color for fallback
const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
};

interface ServiceIconProps {
    name: string;
    logoUrl?: string;
    className?: string;
    style?: React.CSSProperties;
    fallbackClassName?: string;
}

export const ServiceIcon: React.FC<ServiceIconProps> = ({ name, logoUrl: propLogoUrl, className, style, fallbackClassName }) => {
    const [error, setError] = useState(false);
    const logoUrl = propLogoUrl || getServiceLogo(name);

    if (error || !logoUrl) {
        return (
            <div
                className={fallbackClassName}
                style={{
                    backgroundColor: stringToColor(name),
                    ...style
                }}
            >
                {name.charAt(0).toUpperCase()}
            </div>
        );
    }

    return (
        <img
            src={logoUrl}
            alt={`${name} logo`}
            className={className}
            style={style}
            onError={() => setError(true)}
        />
    );
};
