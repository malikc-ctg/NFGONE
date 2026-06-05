/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/:path((?!admin|api|_next|favicon.ico|.*\\.).*)',
        destination: '/',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
