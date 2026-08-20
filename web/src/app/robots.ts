import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thelurkening.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/channels', '/channel/', '/post/'],
        disallow: ['/api/', '/admin/', '/login'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
