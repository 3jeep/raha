import withPWAInit from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  experimental: {
    webpackBuildWorker: false,
    parallelServerCompiles: false,
    parallelServerBuildTraces: false,
    workerThreads: false,
    cpus: 1, 
  },

  webpack: (config, { dev }) => {
    if (!dev) {
      config.cache = false;
      // قمنا بحذف تعطيل الـ minimize هنا للسماح بضغط ملفات النظام الأساسية فقط
    }
    return config;
  },
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", 
  register: true,
  skipWaiting: true,
  
  cacheOnFrontEndNav: false, 
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  swcMinify: true, // تفعيل هذا الخيار ضروري جداً لتعريف الـ PWA بشكل صحيح
  
  workboxOptions: {
    disableDevLogs: true,
    // تم تبسيط الكاش لضمان عدم حدوث تعارض يمنع التثبيت
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
        handler: 'NetworkOnly', 
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-images',
          expiration: {
            maxEntries: 40,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          },
        },
      },
      // إضافة كاش افتراضي لبقية الملفات لضمان عمل التطبيق Offline وهو شرط للتثبيت
      {
        urlPattern: /.*/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'others'
        }
      }
    ]
  },
});

export default withPWA(nextConfig);
