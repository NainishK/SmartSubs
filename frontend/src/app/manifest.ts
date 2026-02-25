import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'SmartSubs',
        short_name: 'SmartSubs',
        description: 'Track, Manage, and Discover content across all your services.',
        start_url: '/dashboard',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0f172a',
        icons: [
            {
                src: '/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
        ],
    };
}
