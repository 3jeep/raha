"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, getDoc, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

export default function PackagesPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<any[]>([]);
  const [laundryPrices, setLaundryPrices] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [completedVisitsCount, setCompletedVisitsCount] = useState(0); // تخزين عدد الزيارات المكتملة

  useEffect(() => {
    // 1. التحقق من عدد الزيارات المكتملة للعميل (منطق الزيارات فقط)
    const checkUserEligibility = async (user: any) => {
      if (!user) return;
      const q = query(
        collection(db, "bookings"),
        where("userId", "==", user.uid),
        where("status", "==", "completed")
      );
      const snap = await getDocs(q);
      setCompletedVisitsCount(snap.size); // حفظ العدد الفعلي
    };

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) checkUserEligibility(user);
    });

    // 2. جلب الباقات مرتبة حسب السعر
    const unsubPkgs = onSnapshot(
      query(collection(db, "packages"), orderBy("price", "asc")), 
      (snapshot) => {
        setPackages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );

    // 3. جلب أسعار الغسيل
    const fetchLaundry = async () => {
      const laundryDoc = await getDoc(doc(db, "settings", "laundry_prices"));
      if (laundryDoc.exists()) setLaundryPrices(laundryDoc.data());
    };
    
    fetchLaundry();
    return () => {
      unsubAuth();
      unsubPkgs();
    };
  }, []);

  const handleBooking = (pkg: any) => {
    // منطق التجميد الجديد: التحقق من الرقم المطلوب
    const requiredVisits = Number(pkg.minCompletedOrders || 0);
    const isLocked = pkg.showIn !== "main" && completedVisitsCount < requiredVisits;
    
    if (isLocked) return; // منع الانتقال إذا كانت مجمدة

    setIsNavigating(true);
    const params = new URLSearchParams({
      pkgName: pkg.name || "باقة راحة",
      pkgPrice: pkg.price ? String(pkg.price) : "0",
      category: pkg.category || "single",
      description: pkg.description || "",
      image: pkg.image || "",
      totalHours: String(pkg.hours || pkg.totalHours || "4")
    });
    
    setTimeout(() => {
      router.push(`/checkout?${params.toString()}`);
    }, 600);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[#1E293B] font-black text-xs animate-pulse italic">جاري تحضير قائمة الخدمات...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 font-sans text-right" dir="rtl">
      
      {isNavigating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-blue-600 font-black text-[10px] animate-pulse">جاري تأمين الحجز...</span>
          </div>
        </div>
      )}

      <div className="relative bg-[#1E293B] pt-20 pb-24 px-8 rounded-b-[60px] shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <h1 className="text-3xl font-black text-white italic relative z-10">قائمة <span className="text-blue-400">الخدمات</span></h1>
        <p className="text-gray-400 text-[10px] font-bold mt-2 relative z-10 uppercase tracking-widest italic">استكشف باقاتنا العادية والحصرية</p>
      </div>

      <div className="px-6 -mt-12 space-y-6 max-w-2xl mx-auto relative z-20">
        {packages.map((pkg) => {
          // حساب الحالة لكل باقة بشكل ديناميكي
          const required = Number(pkg.minCompletedOrders || 0);
          const isLocked = pkg.showIn !== "main" && completedVisitsCount < required;

          return (
            <div 
              key={pkg.id} 
              onClick={() => handleBooking(pkg)}
              className={`group bg-white rounded-[45px] p-2 shadow-xl shadow-blue-900/5 border transition-all relative overflow-hidden 
                ${isLocked ? 'opacity-70 grayscale cursor-not-allowed border-gray-100' : 'hover:border-blue-100 active:scale-[0.97] cursor-pointer border-white'}`}
            >
              <div className="flex items-center gap-4 p-4">
                <div className="relative">
                  <img 
                    src={pkg.image || "https://img.freepik.com/free-vector/cleaning-service-logo-design_23-2148525287.jpg"} 
                    className="w-24 h-24 rounded-[35px] object-cover border-2 border-gray-50 shadow-sm" 
                    alt={pkg.name}
                  />
                  {isLocked ? (
                    <div className="absolute inset-0 bg-[#1E293B]/60 rounded-[35px] flex items-center justify-center text-white text-xl">🔒</div>
                  ) : (
                    <div className={`absolute -top-2 -right-2 px-3 py-1 rounded-full text-[8px] font-black text-white shadow-lg ${pkg.timePeriod === 'morning' ? 'bg-amber-500' : 'bg-indigo-600'}`}>
                      {pkg.timePeriod === 'morning' ? '☀️ صباحي' : '🌙 مسائي'}
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-black text-[#1E293B] italic leading-tight">
                      {pkg.name}
                    </h3>
                  </div>
                  
                  {/* عرض حالة القفل أو التوفر */}
                  {isLocked ? (
                    <div className="flex flex-col gap-1">
                       <span className="text-[8px] text-red-500 font-bold uppercase italic">
                         🏆 باقة متميزة: تحتاج {required} زيارات
                       </span>
                       <span className="text-[7px] text-gray-400 font-black">
                         (رصيدك الحالي: {completedVisitsCount} زيارة)
                       </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 pt-2">
                      <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black border border-blue-100">
                        ⏱️ {pkg.category === 'monthly' ? 'اشتراك شهري' : `${pkg.hours || 4} ساعات`}
                      </span>
                      <span className="text-blue-700 font-black text-sm italic">{pkg.price} <small className="text-[8px] text-gray-400 mr-1 italic">ج.س</small></span>
                    </div>
                  )}
                </div>

                {!isLocked && (
                  <div className="w-10 h-10 bg-[#F8FAFC] group-hover:bg-blue-600 group-hover:text-white rounded-full flex items-center justify-center text-[#1E293B] transition-colors rotate-180 border border-gray-50">
                    →
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* قسم غسيل دليفري */}
        {laundryPrices && (
          <div 
            onClick={() => {
              setIsNavigating(true);
              setTimeout(() => router.push('/checkout2'), 600);
            }}
            className="relative bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[45px] p-6 shadow-2xl overflow-hidden active:scale-95 transition-all cursor-pointer border-4 border-white"
          >
            <div className="absolute -right-4 -bottom-4 opacity-20 rotate-12 text-8xl">🧺</div>
            <div className="relative z-10 flex justify-between items-center text-white">
              <div className="space-y-1">
                <div className="bg-white/20 backdrop-blur-md w-fit px-3 py-1 rounded-full border border-white/30 text-[8px] font-black uppercase italic">خدمة مضافة</div>
                <h3 className="text-2xl font-black italic">غسيل دليفري</h3>
                <p className="text-indigo-100/80 text-[10px] font-bold italic">نستلم ملابسك ونعيدها لك</p>
              </div>
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-indigo-600 text-xl rotate-180 shadow-xl">→</div>
            </div>
          </div>
        )}
      </div>

      <Link 
        href="/" 
        className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#1E293B]/90 backdrop-blur-md text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 border border-white/20 active:scale-90 transition-all z-50"
      >
        <span className="text-lg">🏠</span>
        <span className="text-[10px] font-black uppercase tracking-widest italic">الرئيسية</span>
      </Link>

    </div>
  );
}
