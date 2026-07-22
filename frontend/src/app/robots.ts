import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bingesensei.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/welcome', '/privacy', '/terms', '/login', '/signup'],
        disallow: ['/dashboard/*', '/profile/*', '/reset-password/*', '/forgot-password/*'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
