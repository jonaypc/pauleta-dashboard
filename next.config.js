/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['pdfjs-dist', 'canvas'],
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com https://unpkg.com blob:; worker-src 'self' blob: https://unpkg.com; connect-src 'self' https://vercel.live https://va.vercel-scripts.com https://unpkg.com https://www.google-analytics.com https://*.supabase.co wss://*.supabase.co;",
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
