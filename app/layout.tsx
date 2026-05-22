import "./globals.css";
import { Metadata, Viewport } from "next";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import InstallPWA from "@/components/InstallPWA";
// تم حذف استيراد NotificationHandler لإيقاف الرسائل التلقائية عند الفتح

export const metadata: Metadata = {
  title: "RaHa - راحة",
  description: "تطبيق راحة للموارد البشرية",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RaHa - راحة",
  },
  formatDetection: {
    telephone: true,
  },
};

export const viewport: Viewport = {
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
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth">
      <head>
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="color-scheme" content="light only" />
      </head>
      <body className="bg-white text-[#1E293B] font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
        
        {/* تم إزالة NotificationHandler من هنا لمنع ظهور التوكن عند فتح التطبيق */}

        <InstallPWA />

        <main className="min-h-screen relative overflow-x-hidden">
          {children}
        </main>

        <FloatingWhatsApp />
        
      </body>
    </html>
  );
}
