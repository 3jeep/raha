import "./globals.css";
import { Metadata, Viewport } from "next";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import InstallPWA from "@/components/InstallPWA";

// 1. إعدادات الـ Metadata المحسنة
export const metadata: Metadata = {
  title: "RaHa - راحة",
  description: "تطبيق راحة للخدمات المنزلية المتميزة",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // يعطي مظهر احترافي أكثر على الآيفون
    title: "RaHa - راحة",
  },
  formatDetection: {
    telephone: true, // تفعيلها مفيد لخدمات الموارد البشرية للاتصال المباشر
  },
};

// 2. إعدادات الشاشة (Viewport) - حل مشكلة البهتان هنا
export const viewport: Viewport = {
  // جعلنا اللون أبيض لضمان وضوح شريط الساعة والبطارية (سوداء) ومنع البهتان
  themeColor: "#ffffff", 
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* إجبار المتصفح على عدم تغيير الألوان تلقائياً */}
        <meta name="color-scheme" content="light only" />
      </head>
      <body className="bg-white text-[#1E293B] font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
        
        {/* بانر تثبيت التطبيق */}
        <InstallPWA />

        <main className="min-h-screen relative overflow-x-hidden">
          {children}
        </main>

        {/* زر الواتساب العائم */}
        <FloatingWhatsApp />
        
      </body>
    </html>
  );
}
