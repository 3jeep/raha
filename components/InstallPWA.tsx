"use client";
import { useState, useEffect } from "react";

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // التحقق مما إذا كان المستخدم قد أغلقه سابقاً في هذه الجلسة
      const isClosed = sessionStorage.getItem("pwa_banner_closed");
      if (!isClosed) setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsVisible(false);
    setDeferredPrompt(null);
  };

  // لا تظهر شيئاً إذا لم يكن المتصفح يدعم التثبيت أو إذا أغلق المستخدم البانر
  if (!isVisible || !deferredPrompt) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-[999] animate-in fade-in slide-in-from-top duration-500">
      <div className="bg-[#1E293B] mx-4 mt-4 p-3 rounded-[22px] shadow-2xl border border-white/10 flex items-center justify-between backdrop-blur-lg">
        <div className="flex items-center gap-3">
          
          {/* --- تم استبدال الحرف بالأيقونة الأصلية --- */}
          <div className="w-12 h-12 bg-gray-50 rounded-xl overflow-hidden shadow-inner flex items-center justify-center border border-white/10">
            <img 
              src="/icon.png" // تأكد من وجود ملف icon.png في مجلد public
              alt="RaHa Logo" 
              className="w-full h-full object-cover" 
            />
          </div>
          
          <div className="flex flex-col text-right">
            <span className="text-white font-black text-[12px]">انضم لعائلة راحة</span>
            <span className="text-gray-400 text-[9px] font-bold mt-1">تجربة أسرع وأخف على هاتفك</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleInstall}
            className="bg-blue-600 text-white px-5 py-3 rounded-[15px] font-black text-[10px] active:scale-95 transition-all shadow-md"
          >
            تثبيت التطبيق الآن
          </button>
        </div>
      </div>
    </div>
  );
}
