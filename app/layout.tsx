import "./globals.css";
import { Metadata, Viewport } from "next";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import InstallPWA from "@/components/InstallPWA"; // تأكد من إنشاء هذا الملف في مجلد components

// 1. إعدادات الـ Metadata
export const metadata: Metadata = {
  title: "RaHa - راحة",
  description: "تطبيق راحة للخدمات المنزلية المتميزة",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RaHa - راحة",
  },
  formatDetection: {
    telephone: false,
  },
};

// 2. إعدادات الشاشة (Viewport)
export const viewport: Viewport = {
  themeColor: "#1E293B",
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
      </head>
      <body className="bg-[#F8FAFC] font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
        
        {/* سيظهر البانر هنا في أعلى كل الصفحات */}
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
