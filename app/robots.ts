import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/wegettinmoneynga/',
        '/contractor/',
        '/customer-site/dashboard/',
        '/customer-site/onboarding/',
        '/partner/',
        '/api/',
      ],
    },
    sitemap: 'https://seaofblue.xyz/sitemap.xml',
  };
}
