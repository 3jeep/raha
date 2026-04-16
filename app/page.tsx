"use client";
import { useState, useEffect, Suspense, lazy } from "react";
import { db, auth } from "@/lib/firebase";
import { 
  collection, query, where, getDocs, doc, getDoc, onSnapshot, orderBy 
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

// --- 1. تعريف شريط التنقل السفلي (BottomNav) خارج المكون الرئيسي لمنع الأخطاء ---
const BottomNav = lazy(() => Promise.resolve({ default: () => {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [hasInProgress, setHasInProgress] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => { if (user) setCurrentUser(user); });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const qCleaning = query(collection(db, "bookings"), where("userId", "==", currentUser.uid));
    const qLaundry = query(collection(db, "laundry_orders"), where("userId", "==", currentUser.uid));
    const unsubCleaning = onSnapshot(qCleaning, (snap1) => {
      const cleaning = snap1.docs.map(d => d.data());
      const unsubLaundry = onSnapshot(qLaundry, (snap2) => {
        const laundry = snap2.docs.map(d => d.data());
        const combined = [...cleaning, ...laundry];
        const active = combined.filter((o: any) => ["pending", "received", "in-progress"].includes(o.status));
        setActiveOrdersCount(active.length);
        setHasInProgress(active.some((o: any) => o.status === "in-progress"));
      });
    });
  }, [currentUser]);

  const navItems = [
    { name: "العروض", icon: "🏠", path: "/" },
    { name: "طلباتي", icon: "📋", path: "/my-chekout" },
    { name: "حسابي", icon: "👤", path: "/profile" },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-[#1E293B] h-16 rounded-[25px] shadow-2xl flex items-center justify-around px-6 z-50 border border-white/20">
      {navItems.map((item) => (
        <Link key={item.path} href={item.path} className={`flex flex-col items-center relative transition-all ${pathname === item.path ? 'scale-110 opacity-100' : 'opacity-50'}`}>
          {item.path === "/my-chekout" && activeOrdersCount > 0 && (
            <span className={`absolute -top-1 -right-1 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg border border-[#1E293B] animate-pulse ${hasInProgress ? 'bg-yellow-400' : 'bg-red-500'}`}>
              {activeOrdersCount}
            </span>
          )}
          <span className="text-xl">{item.icon}</span>
          <span className="text-[9px] font-black text-white mt-1 uppercase">{item.name}</span>
        </Link>
      ))}
    </div>
  );
}}));

export default function WelcomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [specialPackages, setSpecialPackages] = useState<any[]>([]);
  const [laundryPrices, setLaundryPrices] = useState<any>(null);
  const [cleaningPrices, setCleaningPrices] = useState<any>(null); 
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [completedVisitsCount, setCompletedVisitsCount] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // --- التحقق من الصلاحيات وتاريخ الزيارات ---
  useEffect(() => {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });

    return onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // جلب بيانات المستخدم للتحقق من زر الإشراف
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const role = userDoc.data().role;
          if (role === "admin" || role === "manager") setIsAdmin(true);
        }

        // جلب تاريخ الزيارات المكتملة لفتح العروض الخاصة
        const qClean = query(collection(db, "bookings"), where("userId", "==", user.uid), where("status", "==", "completed"));
        const snap = await getDocs(qClean);
        setCompletedVisitsCount(snap.size);
      }
    });
  }, []);

  // --- جلب الإعدادات والأسعار من Firestore ---
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const qSpecial = query(collection(db, "packages"), where("showIn", "==", "special"));
        const [laundryDoc, cleaningDoc, snapSpecial] = await Promise.all([
          getDoc(doc(db, "settings", "laundry_prices")),
          getDoc(doc(db, "settings", "cleaning_prices")),
          getDocs(qSpecial)
        ]);
        
        setSpecialPackages(snapSpecial.docs.map(d => ({ id: d.id, ...d.data() })));
        if (laundryDoc.exists()) setLaundryPrices(laundryDoc.data());
        if (cleaningDoc.exists()) setCleaningPrices(cleaningDoc.data());
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchAllData();
  }, []);

  // --- الخدمات الأساسية (Static) ---
  const staticMainServices = [
    {
      id: "single_visit",
      name: "زيارة مفردة",
      description: "خدمة نظافة شاملة لمرة واحدة باحترافية عالية لراحة منزلك.",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQqdXW2Y6Ukrio0ceZzKOJJCp5JORWa6TWRS5USW557iQ&s=10",
      price: cleaningPrices?.single_price || 0,
      path: "/singleout?type=single",
      gradient: "from-[#1E293B] to-purple-800",
      icon: "✨"
    },
    {
      id: "multi_visit",
      name: "زيارة متعددة ",
      description: "باقة الزيارات المتكررة والعقود الشهرية لتوفير أكبر وراحة مستمرة.",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQtPPMUccXWMhuLxq6N3F0X1KFhw7MLphrzj9ZxgkbeqGkzQl_g0CQT2ow&s=10",
      price: cleaningPrices?.multi_price || 0,
      path: "/RahaContract?type=multi",
      gradient: "from-[#1E293B] to-indigo-800",
      icon: "📦"
    }
  ];

  const handleBooking = (pkg: any) => {
    setIsNavigating(true);
    if (pkg.path) {
      router.push(pkg.path);
    } else {
      router.push(`/checkout?id=${pkg.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-right pb-40" dir="rtl">
      
      {/* Loading Overlay */}
      {isNavigating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl flex flex-col items-center gap-4 border-2 border-blue-100 animate-in fade-in zoom-in">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-900 font-black text-sm italic">جاري التحميل...</span>
          </div>
        </div>
      )}

      {/* زر الإشراف */}
      {isAdmin && (
        <div className="fixed top-24 left-6 z-[60] animate-bounce">
          <button onClick={() => router.push("/admin/access")} className="bg-red-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center border-4 border-white active:scale-90 font-black text-[10px] italic uppercase">الإشراف</button>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative h-[220px] w-full overflow-hidden rounded-b-[50px] shadow-2xl bg-[#1E293B]">
        <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQtPPMUccXWMhuLxq6N3F0X1KFhw7MLphrzj9ZxgkbeqGkzQl_g0CQT2ow&s=10" className="w-full h-full object-cover opacity-80" alt="Hero" />
        
        {/* Header Elements: Logo & Login */}
        <div className="absolute top-10 left-8 right-8 flex justify-between items-center z-10">
          {!user ? (
            <button 
              onClick={() => router.push("/login")}
              className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30 text-white font-black text-[10px] uppercase italic shadow-lg active:scale-90 transition-all"
            >
              تسجيل دخول 👤
            </button>
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-white/30 flex items-center justify-center text-white text-xs">✔️</div>
          )}
          
          <div className="flex items-center gap-3 bg-white/20 backdrop-blur-xl p-2 px-4 rounded-full border border-white/30 shadow-2xl">
            <span className="text-white font-black text-lg italic tracking-tighter">راحة</span>
            <div className="w-8 h-8 rounded-full bg-white overflow-hidden border-2 border-blue-400">
              <img src="/icon.png" className="w-full h-full object-cover" alt="App Icon" />
            </div>
          </div>
        </div>
      </div>

      {/* زر العروض المحدث بتصميم أنيق */}
      <div className="px-6 -translate-y-8">
        <div 
          onClick={() => { setIsNavigating(true); router.push("/packages"); }} 
          className="relative bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-[35px] flex justify-between items-center shadow-2xl active:scale-95 transition-all cursor-pointer border-b-4 border-indigo-900 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-white/20 p-2 rounded-2xl backdrop-blur-sm border border-white/20">
               <span className="text-white text-xl">🏷️</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-black text-sm italic leading-none">جميع العروض الحصرية</span>
              <span className="text-blue-200 text-[9px] font-bold mt-1 uppercase tracking-wider">خصومات تصل إلى 40%</span>
            </div>
          </div>
          <div className="bg-white w-10 h-10 rounded-full flex items-center justify-center text-indigo-700 font-black shadow-lg rotate-180">
            →
          </div>
        </div>
      </div>

      <div className="px-6 space-y-6">
        <h3 className="text-gray-900 font-black text-2xl italic underline decoration-blue-500 decoration-4 underline-offset-8 px-2">خدماتنا الرئيسية</h3>
        
        <div className="grid grid-cols-1 gap-5">
          {loading ? <div className="h-28 bg-gray-200 animate-pulse rounded-[40px]" /> : (
            <>
              {/* الخدمات الثابتة */}
              {staticMainServices.map((pkg) => Number(pkg.price) > 0 && (
                <div 
                  key={pkg.id} 
                  onClick={() => handleBooking(pkg)}
                  className={`relative bg-gradient-to-br ${pkg.gradient} rounded-[45px] p-6 shadow-2xl overflow-hidden active:scale-95 transition-all cursor-pointer border-4 border-white`}
                >
                  <div className="absolute -right-4 -bottom-4 opacity-20 rotate-12 text-8xl">{pkg.icon}</div>
                  <div className="relative z-10 flex justify-between items-center text-white">
                    <div className="space-y-1">
                      <div className="bg-white/20 backdrop-blur-md w-fit px-3 py-1 rounded-full border border-white/30 text-[8px] font-black uppercase italic">
                        {pkg.id === "single_visit" ? "زيارة لمرة واحدة" : "باقات توفير"}
                      </div>
                      <h3 className="text-2xl font-black italic">{pkg.name}</h3>
                      <p className="text-white/80 text-[10px] font-bold italic line-clamp-1">{pkg.description}</p>
                    </div>
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#1E293B] text-xl rotate-180 shadow-xl">→</div>
                  </div>
                </div>
              ))}

              {/* غسيل دليفري */}
              {laundryPrices && (Number(laundryPrices.wash) > 0) && (
                <div 
                  onClick={() => { setIsNavigating(true); router.push("/checkout2"); }} 
                  className="relative bg-gradient-to-br from-[#1E293B] to-blue-700 rounded-[45px] p-6 shadow-2xl overflow-hidden active:scale-95 transition-all cursor-pointer border-4 border-white"
                >
                  <div className="absolute -right-4 -bottom-4 opacity-20 rotate-12 text-8xl">🧺</div>
                  <div className="relative z-10 flex justify-between items-center text-white">
                    <div className="space-y-1">
                      <div className="bg-white/20 backdrop-blur-md w-fit px-3 py-1 rounded-full border border-white/30 text-[8px] font-black uppercase italic">خدمة مضافة</div>
                      <h3 className="text-2xl font-black italic">غسيل دليفري</h3>
                      <p className="text-blue-100/80 text-[10px] font-bold italic">نستلم ملابسك ونعيدها لك باحترافية</p>
                    </div>
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#1E293B] text-xl rotate-180 shadow-xl">→</div>
                  </div>
                </div>
              )}

              {/* العروض الخاصة (Dynamic) */}
              {specialPackages.map((pkg) => {
                const isLocked = completedVisitsCount < Number(pkg.minCompletedOrders || 0);
                return (
                  <div key={pkg.id} onClick={() => !isLocked && handleBooking(pkg)} className={`p-5 rounded-[45px] border-2 border-dashed flex justify-between items-center transition-all ${isLocked ? 'bg-gray-100 opacity-60 grayscale pointer-events-none' : 'bg-white border-blue-200 shadow-xl cursor-pointer active:scale-95'}`}>
                    <div className="flex items-center gap-4 flex-1">
                      <div className="relative"><img src={pkg.image} className="w-16 h-16 rounded-[25px] object-cover" alt={pkg.name} />{isLocked && <div className="absolute inset-0 bg-black/30 rounded-[25px] flex items-center justify-center text-white">🔒</div>}</div>
                      <div className="flex flex-col"><span className="text-gray-900 font-black text-[15px] italic leading-tight">{pkg.name}</span><span className="text-blue-700 font-black text-[12px]">{pkg.price} ج.س</span></div>
                    </div>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white rotate-180 ${isLocked ? 'bg-gray-400' : 'bg-blue-700'}`}>{isLocked ? '🏆' : '→'}</div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* قسم صور الموظفين */}
      <div className="px-6 mt-12 grid grid-cols-2 gap-5 h-[180px] opacity-90">
        <div className="relative overflow-hidden rounded-[40px] shadow-2xl border-4 border-white rotate-2">
          <img src="https://thumbs.dreamstime.com/z/woman-basket-cleaning-equipment-smiling-african-holding-74155063.jpg" className="w-full h-full object-cover" alt="Staff 1" />
        </div>
        <div className="relative overflow-hidden rounded-[40px] shadow-2xl border-4 border-white -rotate-2 translate-y-4">
          <img src="https://hosawanos.com/wp-content/uploads/2019/02/woman-staff-cleaning.jpg" className="w-full h-full object-cover" alt="Staff 2" />
        </div>
      </div>

      {/* زر تثبيت التطبيق */}
      {showInstallBtn && (
        <div className="px-6 mt-20">
           <button onClick={() => deferredPrompt?.prompt()} className="w-full bg-gray-900 text-white py-5 rounded-[35px] font-black text-sm shadow-2xl flex items-center justify-center gap-3 border-b-4 border-gray-700 active:scale-95">تثبيت تطبيق "راحة" 📱</button>
        </div>
      )}

      <Suspense fallback={null}><BottomNav /></Suspense>
    </div>
  );
}
