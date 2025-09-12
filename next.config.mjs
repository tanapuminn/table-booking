/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // เพิ่มการตั้งค่าเพื่อแก้ปัญหา ChunkLoadError
  experimental: {
    optimizeCss: true,
  },
  // เพิ่มการตั้งค่า webpack เพื่อจัดการ chunks
  webpack: (config, { dev, isServer }) => {
    // เพิ่มการจัดการ error สำหรับ chunks
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 1,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
          },
        },
      },
    };

    // เพิ่มการจัดการ error
    config.stats = {
      ...config.stats,
      errorDetails: true,
    };

    return config;
  },
  // เพิ่มการตั้งค่าเพื่อป้องกัน chunk loading errors
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}

export default nextConfig