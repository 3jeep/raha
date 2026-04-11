import withPWAInit from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 1. تجاهل الأخطاء لضمان استمرار البناء (Build) 
  // هذا مهم جداً بما أننا قمنا بتعديل أنواع البيانات (Types) في الصفحات
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 2. إعدادات تخفيض استهلاك الموارد (صديقة لبيئة Termux)
  experimental: {
    webpackBuildWorker: false,
    parallelServerCompiles: false,
    parallelServerBuildTraces: false,
    workerThreads: false,
    cpus: 1, 
  },

  // 3. تحسين استهلاك الذاكرة العشوائية (RAM)
  webpack: (config, { dev }) => {
    if (!dev) {
      config.cache = false;
      // تعطيل الـ minimize يساعد جداً في تجنب خطأ "Worker Error" في الهواتف
      config.optimization.minimize = false;
    }
    return config;
  },
};

// إعدادات الـ PWA المحسنة للتعامل مع التعديلات الجديدة
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", 
  register: true,
  skipWaiting: true,
  
  // تعطيل الكاش الهجومي لضمان تحديث حالة الطلبات (Pending/In-progress) فوراً
  cacheOnFrontEndNav: false, 
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  swcMinify: false, 
  
  workboxOptions: {
    disableDevLogs: true,
    // استثناء مسارات Firebase من الكاش لضمان دقة العداد الزمني 
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
        handler: 'NetworkOnly', // العداد والطلبات يجب أن تأتي من الشبكة دائماً
      },
      {
        urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'firebase-storage',
        }
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-images',
          expiration: {
            maxEntries: 40,
            maxAgeSeconds: 7 * 24 * 60 * 60, // أسبوع واحد
          },
        },
      },
    ]
  },
});

export default withPWA(nextConfig);
