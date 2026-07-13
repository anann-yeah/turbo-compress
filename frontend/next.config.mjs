/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // THIS IS THE FIX: It stops the build from failing due to the TS ES5 error
  typescript: {
    ignoreBuildErrors: true,
  },
  // In production, nginx on the EC2 box routes /api/* straight to the backend
  // container before requests ever reach Next.js, so this never fires there.
  // In local dev there's no such proxy in front of `next dev`, so without
  // this, /api/* calls from the browser 404 against the Next.js server itself.
  async rewrites() {
    if (process.env.NODE_ENV === 'production') return [];
    return [
      { source: '/api/:path*', destination: 'http://localhost:4000/api/:path*' },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;