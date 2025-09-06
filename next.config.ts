import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', '@elevenlabs/elevenlabs-js'],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // File size limits
  serverRuntimeConfig: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Handle audio files
    config.module.rules.push({
      test: /\.(mp3|wav|m4a|ogg|webm|flac)$/,
      type: 'asset/resource',
    });

    // Optimize for production
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },

  // Compression
  compress: true,

  // PoweredByHeader
  poweredByHeader: false,

  // React strict mode
  reactStrictMode: true,

  // Trailing slash
  trailingSlash: false,
};

export default nextConfig;
