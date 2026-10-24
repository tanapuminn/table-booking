/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizeCss: true,
  },
  async rewrites() {
    const apiOrigin = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "")
    if (!apiOrigin) return []

    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
