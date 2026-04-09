"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function WelcomePage() {
  const [userName, setUserName] = useState("");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // نأخذ الاسم الأول للمستخدم للترحيب الشخصي
        const name = user.displayName?.split(" ")[0] || "يا غالي";
        setUserName(name);

        // التوجيه التلقائي للصفحة الرئيسية بعد 3.5 ثانية
        const timer = setTimeout(() => {
          router.push("/");
        }, 3500);

        return () => clearTimeout(timer);
      } else {
        // إذا لم يسجل دخول يذهب لصفحة اللوجن
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#F0F7FF] flex flex-col items-center justify-center p-6 text-center font-sans overflow-hidden" dir="rtl">
      
      {/* أنيميشن الدوائر المتداخلة في الخلفية */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-50 rounded-full blur-[120px] opacity-60 animate-pulse"></div>

      {/* منطقة الشعار والترحيب */}
      <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-1000">
        
        {/* اللوجو مع تأثير الظل العائم */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-400 rounded-full blur-2xl opacity-20 scale-125 animate-pulse"></div>
          <img 
            src="/icon.png" 
            className="w-40 h-40 rounded-full object-cover shadow-2xl border-4 border-white relative z-10 animate-bounce-subtle" 
            alt="Raha Logo"
          />
        </div>

        {/* نصوص الترحيب */}
        <div className="space-y-3">
          <h1 className="text-4xl font-black text-[#1E293B] tracking-tight">
            حبابك ألف، <span className="text-[#2B4C7E]">{userName}</span>
          </h1>
          <p className="text-gray-400 font-bold text-sm tracking-[0.2em] uppercase">
            بنزبط ليك في عالمك الخاص...
          </p>
        </div>

        {/* مؤشر التحميل (Progress Bar) */}
        <div className="mt-12 w-40 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#2B4C7E] rounded-full animate-progress-loading"></div>
        </div>
      </div>

      {/* الستايلات الخاصة بالأنيميشن المذكور في الكود */}
      <style jsx>{`
        @keyframes progress-loading {
          0% { width: 0%; transform: translateX(100%); }
          100% { width: 100%; transform: translateX(0%); }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-progress-loading {
          animation: progress-loading 3s ease-in-out forwards;
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
      `}</style>

    </div>
  );
}
