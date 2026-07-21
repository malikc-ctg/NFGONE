import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/wegettinmoneynga/',
        '/employee/',
        '/customer-site/dashboard/',
        '/customer-site/onboarding/',
        '/partner/',
        '/api/',
      ],
    },
    sitemap: 'https://seaofblue.ca/sitemap.xml',
  };
}
