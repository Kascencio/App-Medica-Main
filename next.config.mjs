/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return {
      // 👇 Reescribe TODO lo de /api/* al proxy ANTES de revisar archivos del proyecto
      beforeFiles: [
        { source: '/api/:path((?!proxy/).*)', destination: 'http://72.60.30.129:3001/api/:path*'  },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
}

export default nextConfig
