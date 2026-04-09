"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

export default function GuestLandingPage() {
  const router = useRouter();
  const [mainPackages, setMainPackages] = useState<any[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);

  // 1. إذا كان المستخدم مسجلاً، انقله فوراً للرئيسية
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) router.push("/");
    });
    return () => unsubscribe();
  }, [router]);

  // 2. جلب العروض العامة فقط
  useEffect(() => {
    const qMain = query(collection(db, "packages"), where("showIn", "==", "main"), limit(3));
    const unsub = onSnapshot(qMain, (snap) => {
      setMainPackages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleLoginRedirect = () => {
    setIsNavigating(true);
    setTimeout(() => router.push("/login"), 500);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-right pb-10" dir="rtl">
      
      {/* شاشة التحميل التفاعلية */}
      {isNavigating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative h-[250px] w-full overflow-hidden rounded-b-[50px] shadow-2xl bg-[#1E293B]">
        <img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=1000" className="w-full h-full object-cover opacity-40" alt="Hero" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <h1 className="text-white font-black text-3xl italic">مرحباً بك في <span className="text-blue-400">راحة</span></h1>
          <p className="text-blue-100/70 text-[10px] font-bold mt-2 italic">خدمات نظافة احترافية بين يديك</p>
        </div>
      </div>

      {/* زر تسجيل الدخول (بديل التنقل) */}
      <div className="px-6 -translate-y-8">
        <button 
          onClick={handleLoginRedirect}
          className="w-full bg-blue-600 p-5 rounded-[30px] shadow-xl flex justify-center items-center gap-3 active:scale-95 transition-all"
        >
          <span className="text-white font-black italic">تسجيل الدخول للبدء</span>
          <span className="text-white">👤</span>
        </button>
      </div>

      <div className="px-6 space-y-6">
        <h3 className="text-[#1E293B] font-black text-xl italic px-2">خدماتنا المتاحة</h3>

        {/* عرض الخدمات (قراءة فقط) */}
        <div className="grid gap-4">
          {mainPackages.map((pkg) => (
            <div key={pkg.id} className="bg-white p-4 rounded-[35px] border border-gray-100 shadow-sm flex items-center gap-4 opacity-80">
              <img src={pkg.image} className="w-16 h-16 rounded-2xl object-cover" alt={pkg.name} />
              <div className="flex flex-col">
                <span className="text-[#1E293B] font-black text-sm italic">{pkg.name}</span>
                <span className="text-blue-600 font-bold text-[10px]">{pkg.price} ج.س</span>
              </div>
            </div>
          ))}
        </div>

        {/* العروض الخاصة (المجمدة - للعرض فقط) */}
        <div className="pt-4">
          <div className="flex justify-between px-2 mb-4">
            <h4 className="text-gray-400 font-black italic">عروض النخبة</h4>
            <span className="text-[9px] bg-gray-100 px-2 py-1 rounded-full text-gray-400">مغلق للزوار 🔒</span>
          </div>
          <div className="bg-gray-100 p-6 rounded-[35px] border-2 border-dashed border-gray-200 text-center">
            <p className="text-gray-400 text-[10px] font-bold italic">سجل دخولك لتستمتع بعروض النخبة الحصرية</p>
          </div>
        </div>
      </div>
    </div>
  );
}
