import withPWAInit from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // يمكنك إضافة أي إعدادات أخرى لـ Next.js هنا (مثل الصور أو الـ Redirects)
};

const withPWA = withPWAInit({
  dest: "public",
  
  // 1. تعطيل الـ PWA تماماً في وضع التطوير (development)
  // هذا السطر هو الحل الجذري لمشكلة الـ Compiling والـ Refresh اللانهائي
  disable: process.env.NODE_ENV === "development", 
  
  register: true,
  skipWaiting: true,
  
  // 2. إيقاف الكاش "العدواني" الذي يسبب تعليق النسخ القديمة من الكود
  cacheOnFrontEndNav: false, 
  aggressiveFrontEndNavCaching: false,
  
  reloadOnOnline: true,
  swcMinify: true,
  
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        // كاش للصور من مصادر خارجية (مثل Unsplash)
        urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
        handler: 'CacheFirst',
        options: { 
          cacheName: 'images-cache', 
          expiration: { 
            maxEntries: 20, 
            maxAgeSeconds: 30 * 24 * 60 * 60 // شهر واحد
          } 
        }
      },
      {
        // جعل التعامل مع بيانات Firestore يتم عبر الـ Firebase SDK نفسه
        // لضمان عدم حدوث تضارب بين كاش المتصفح وكاش الفايربيس
        urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
        handler: 'NetworkOnly', 
      }
    ]
  },
});

export default withPWA(nextConfig);
