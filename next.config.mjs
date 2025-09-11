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
      { source: '/api/:path*', destination: 'http://72.60.30.129:3001/api/:path*' },
    ];
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
