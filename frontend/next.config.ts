import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.23'],
  
  // Image Optimization
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'ilenafurniture.net',
        pathname: '/uploads/**',
      },
    ],
    formats: ['image/webp', 'image/avif'], // Modern image formats
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // Responsive breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Icon sizes
    minimumCacheTTL: 31536000, // 1 year cache for optimized images
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Compression - Enable gzip/brotli compression
  compress: true,
  
  // Turbopack Configuration (Next.js 16+)
  turbopack: {},
  
  // Compiler Options
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Experimental Features for Performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: [
      '@react-three/fiber',
      '@react-three/drei',
      'three',
      'zustand',
      'lucide-react',
    ],
    // Enable CSS optimization
    optimizeCss: true,
  },

  // Production Source Maps (smaller, for error tracking)
  productionBrowserSourceMaps: false, // Disable to reduce bundle size

  // Output Configuration
  output: 'standalone', // Optimized for deployment

  // Webpack Configuration for Advanced Optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations only
    if (!dev) {
      // Enable tree shaking
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        
        // Split chunks for optimal caching
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Vendor chunk for node_modules
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              reuseExistingChunk: true,
            },
            // Three.js specific chunk (large library)
            three: {
              test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
              name: 'three',
              priority: 20,
              reuseExistingChunk: true,
            },
            // React chunk
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              name: 'react',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Common chunk for shared code
            common: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
              name: 'common',
            },
          },
        },
        
        // Minimize bundle size
        minimize: true,
      };

      // Content hashing for cache busting
      config.output = {
        ...config.output,
        filename: isServer 
          ? '[name].js' 
          : 'static/chunks/[name].[contenthash].js',
        chunkFilename: isServer
          ? '[name].js'
          : 'static/chunks/[name].[contenthash].js',
      };
    }

    // Bundle Analyzer (optional, enable with ANALYZE=true)
    if (process.env.ANALYZE === 'true') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer 
            ? '../analyze/server.html' 
            : './analyze/client.html',
          openAnalyzer: false,
          generateStatsFile: true,
          statsFilename: isServer 
            ? '../analyze/server-stats.json' 
            : './analyze/client-stats.json',
        })
      );
    }

    return config;
  },

  // Headers for caching and security
  async headers() {
    return [
      {
        // Service worker must never be cached + wipe stale chunks
        // when /sw.js is fetched. We only clear "cache" (HTTP cache +
        // Cache API) here, NOT "storage" - clearing storage would
        // wipe localStorage and force every user to re-login on each
        // deploy. The kill-switch SW handles its own unregistration
        // in its activate handler.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Clear-Site-Data', value: '"cache"' },
        ],
      },
      {
        // Force HTML pages to revalidate so users always get the
        // latest chunk references after a deploy. Static chunks below
        // keep their immutable cache (content-hashed filenames make
        // this safe).
        source: '/((?!_next/static|uploads).*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable', // 1 year cache
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable', // 1 year cache for static assets
          },
        ],
      },
      {
        source: '/:path*.webp',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*.glb',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        // Legacy admin Preview button used the plural form. Permanent
        // redirect so old links / bookmarks land on the real page.
        source: '/products/:id',
        destination: '/product/:id',
        permanent: true,
      },
    ];
  },

  async rewrites() {
    return [
      {
        // Proxy semua /api/* ke backend
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
      {
        // Proxy semua /uploads/* ke backend
        source: '/uploads/:path*',
        destination: 'http://localhost:5000/uploads/:path*',
      },
      // ----------------------------------------------------------------
      // Legacy URL catch-alls.
      //
      // Some users still have JS chunks cached from before we hard-coded
      // the /api prefix at every call site. Those chunks call paths like
      // /auth/login, /notifications, /wallpapers without the /api
      // prefix. Forward them to the backend so login keeps working even
      // for stale clients. Safe because none of these paths are also
      // Next.js pages.
      // Remove these once cache rotation is complete (a week or two).
      // ----------------------------------------------------------------
      { source: '/auth/:path*',          destination: 'http://localhost:5000/api/auth/:path*' },
      { source: '/notifications/:path*', destination: 'http://localhost:5000/api/notifications/:path*' },
      { source: '/wallpapers/:path*',    destination: 'http://localhost:5000/api/wallpapers/:path*' },
    ];
  },

  // Power-saving mode for development
  poweredByHeader: false, // Remove X-Powered-By header
  
  // Generate ETags for caching
  generateEtags: true,

  // Strict mode for better performance
  reactStrictMode: true,
};

export default nextConfig;
