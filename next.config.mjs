/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: '/api/proxy/:path*' },
    ];
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
