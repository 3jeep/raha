"use client";
import { useState, useEffect, Suspense, lazy } from "react";
import { db, auth } from "@/lib/firebase";
import { 
  collection, query, where, getDocs, doc, getDoc, limit 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

// --- شريط التنقل السفلي ---
const BottomNav = lazy(() => Promise.resolve({ default: () => {
  const pathname = usePathname();
  const navItems = [
    { name: "العروض", icon: "🏠", path: "/" },
    { name: "طلباتي", icon: "📋", path: "/my-chekout" },
    { name: "حسابي", icon: "👤", path: "/profile" },
  ];
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-[#1E293B] h-16 rounded-[25px] shadow-2xl flex items-center justify-around px-6 z-50 border border-white/20">
      {navItems.map((item) => (
        <Link 
          key={item.path} 
          href={item.path} 
          className={`flex flex-col items-center transition-all ${
            pathname === item.path ? 'scale-110 opacity-100' : 'opacity-50'
          }`}
        >
          <span className="text-xl">{item.icon}</span>
          <span className={`text-[9px] font-black text-white mt-1 uppercase`}>{item.name}</span>
        </Link>
      ))}
    </div>
  );
}}));

export default function WelcomePage() {
  const router = useRouter();
  const [mainPackages, setMainPackages] = useState<any[]>([]);
  const [specialPackages, setSpecialPackages] = useState<any[]>([]);
  const [laundryPrices, setLaundryPrices] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [completedVisitsCount, setCompletedVisitsCount] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // خاص بتثبيت التطبيق
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    // منطق التقاط حدث تثبيت التطبيق
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const role = userDoc.data().role;
          if (role === "admin" || role === "manager") setIsAdmin(true);
        }

        const fetchVisitHistory = async () => {
          const qClean = query(
            collection(db, "bookings"), 
            where("userId", "==", user.uid), 
            where("status", "==", "completed")
          );
          const snap = await getDocs(qClean);
          setCompletedVisitsCount(snap.size);
        };
        fetchVisitHistory();
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const qMain = query(collection(db, "packages"), where("showIn", "==", "main"));
        const qSpecial = query(collection(db, "packages"), where("showIn", "==", "special"));
        const laundryDoc = await getDoc(doc(db, "settings", "laundry_prices"));
        
        const [snapMain, snapSpecial] = await Promise.all([getDocs(qMain), getDocs(qSpecial)]);
        
        setMainPackages(snapMain.docs.map(d => ({ id: d.id, ...d.data() })));
        setSpecialPackages(snapSpecial.docs.map(d => ({ id: d.id, ...d.data() })));
        if (laundryDoc.exists()) setLaundryPrices(laundryDoc.data());
      } catch (e) {
        console.error("Fetch Error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const shouldShowLaundry = () => {
    if (!laundryPrices) return false;
    const { iron, ironOnly, wash } = laundryPrices;
    return (Number(wash) > 0) || (Number(iron) > 0) || (Number(ironOnly) > 0);
  };

  const navigateTo = (path: string, params?: URLSearchParams) => {
    setIsNavigating(true);
    const finalPath = params ? `${path}?${params.toString()}` : path;
    router.push(finalPath);
  };

  const handleBooking = (pkg: any) => {
    const requiredVisits = Number(pkg.minCompletedOrders || 0);
    const isLocked = requiredVisits > completedVisitsCount;

    if (pkg.showIn === "special" && isLocked) return;
    
    const params = new URLSearchParams({
      pkgName: pkg.name || "باقة راحة",
      pkgPrice: pkg.price ? String(pkg.price) : "0",
      category: pkg.category || "single", 
      description: pkg.description || "",
      image: pkg.image || "",
      hours: String(pkg.totalHours || "4")
    });
    
    navigateTo("/checkout", params);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-right pb-40" dir="rtl">
      
      {isNavigating && (
        <div className="fixed top-0 left-0 w-full h-full z-[100] flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl flex flex-col items-center gap-4 border-2 border-blue-100">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-900 font-black text-sm italic">جاري التحميل...</span>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="fixed top-24 left-6 z-[60] animate-bounce">
          <button onClick={() => navigateTo("/admin/access")} className="bg-red-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center border-4 border-white active:scale-90">
            <span className="font-black text-[10px] uppercase italic">الإشراف</span>
          </button>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative h-[220px] w-full overflow-hidden rounded-b-[50px] shadow-2xl bg-[#1E293B]">
        <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQtPPMUccXWMhuLxq6N3F0X1KFhw7MLphrzj9ZxgkbeqGkzQl_g0CQT2ow&s=10" className="w-full h-full object-cover opacity-80" alt="Hero" />
        <div className="absolute top-10 right-8 flex items-center gap-3 bg-white/20 backdrop-blur-xl p-3 px-5 rounded-[25px] border border-white/30">
            <span className="text-white font-black text-xl italic tracking-tighter">راحة <span className="text-blue-400">RaHa</span></span>
        </div>
      </div>

      <div className="px-6 -translate-y-8">
        <div onClick={() => navigateTo("/packages")} className="bg-green-600 p-6 rounded-[35px] flex justify-between items-center shadow-xl active:scale-95 transition-all cursor-pointer border-b-4 border-green-800">
          <div className="flex items-center gap-3"><span className="text-white font-black text-sm italic">استكشف جميع العروض الحصرية</span><div className="bg-white/30 p-2 rounded-full text-white text-xl rotate-180 font-black">→</div></div>
          <div className="bg-white p-2 rounded-xl text-green-700 font-black text-sm">%</div>
        </div>
      </div>

      <div className="px-6 space-y-6">
        <h3 className="text-gray-900 font-black text-2xl italic underline decoration-blue-500 decoration-4 underline-offset-8 px-2">خدماتنا الرئيسية</h3>

        <div className="grid grid-cols-1 gap-5">
          {loading ? (
            <div className="h-28 bg-gray-200 animate-pulse rounded-[40px]"></div>
          ) : (
            <>
              {mainPackages.map((pkg) => (
                <div key={pkg.id} onClick={() => handleBooking(pkg)} className="bg-white p-5 rounded-[45px] border-2 border-gray-50 shadow-xl flex justify-between items-center active:scale-[0.98] transition-all cursor-pointer">
                  <div className="flex items-center gap-4 flex-1">
                    <img src={pkg.image} className="w-20 h-20 bg-gray-50 rounded-[30px] object-cover border-2 border-gray-100" alt={pkg.name} />
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-900 font-black text-lg italic leading-none mb-1">{pkg.name}</span>
                      <p className="text-gray-600 text-[11px] font-black line-clamp-1 italic">{pkg.description}</p>
                      <span className="text-blue-700 font-black text-[13px]">{pkg.price} ج.س</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white rotate-180 shadow-md">→</div>
                </div>
              ))}

              {shouldShowLaundry() && (
                <div onClick={() => navigateTo("/checkout2")} className="bg-indigo-50 p-5 rounded-[45px] border-2 border-indigo-100 shadow-xl flex justify-between items-center active:scale-[0.98] cursor-pointer">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-20 h-20 bg-white rounded-[30px] overflow-hidden border-2 border-white shadow-sm">
                        <img src="https://wetndrylaundry.com/wp-content/uploads/2026/01/fast-delivery.png" className="w-full h-full object-cover" alt="Laundry" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-gray-900 font-black text-lg italic">غسيل دليفري</span>
                        <p className="text-indigo-900 text-[11px] font-black italic line-clamp-1 opacity-70">استلام وتسليم دقيق واحترافي.</p>
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-indigo-700 rounded-full flex items-center justify-center text-white rotate-180 shadow-lg">→</div>
                </div>
              )}

              {specialPackages.length > 0 && (
                <div className="pt-6">
                  <h4 className="text-gray-900 font-black text-lg italic uppercase px-4 mb-4">🏆 عروض التميز الحصرية</h4>
                  <div className="space-y-4">
                    {specialPackages.map((pkg) => {
                      const required = Number(pkg.minCompletedOrders || 0);
                      const isLocked = completedVisitsCount < required;

                      return (
                        <div key={pkg.id} 
                          onClick={() => handleBooking(pkg)} 
                          className={`relative overflow-hidden p-5 rounded-[45px] border-2 border-dashed flex justify-between items-center transition-all duration-500 
                          ${!isLocked ? 'bg-white border-blue-200 shadow-xl active:scale-95 cursor-pointer' 
                                      : 'bg-gray-100 border-gray-300 grayscale opacity-60 pointer-events-none'}`}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="relative">
                               <img src={pkg.image} className="w-16 h-16 rounded-[25px] object-cover border-2 border-white shadow-md" alt={pkg.name} />
                               {isLocked && <div className="absolute inset-0 bg-black/30 rounded-[25px] flex items-center justify-center text-white text-sm font-black">🔒</div>}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-gray-900 font-black text-[15px] italic leading-tight">{pkg.name}</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                 <span className="text-blue-700 font-black text-[12px]">{pkg.price} ج.س</span>
                                 {isLocked && (
                                   <span className="text-[9px] font-black text-red-600 bg-red-100 px-3 py-1 rounded-full italic">
                                     يفتح بعد {required} زيارة (لديك {completedVisitsCount})
                                   </span>
                                 )}
                              </div>
                            </div>
                          </div>
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white rotate-180 shadow-lg ${!isLocked ? 'bg-blue-700' : 'bg-gray-500'}`}>
                            {!isLocked ? '→' : '🏆'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* زر تثبيت التطبيق */}
      {showInstallBtn && (
        <div className="px-6 mt-10">
           <button 
             onClick={handleInstallClick}
             className="w-full bg-gray-900 text-white py-5 rounded-[35px] font-black text-sm shadow-2xl flex items-center justify-center gap-3 active:scale-95 border-b-4 border-gray-700"
           >
             <span>تثبيت تطبيق "راحة" على هاتفك 📱</span>
           </button>
           <p className="text-center text-gray-500 text-[9px] font-black mt-2 italic">احصل على وصول أسرع وتنبيهات فورية!</p>
        </div>
      )}

      <div className="px-6 mt-12 grid grid-cols-2 gap-5 h-[180px] opacity-90">
        <div className="relative overflow-hidden rounded-[40px] shadow-2xl border-4 border-white rotate-2">
          <img src="https://thumbs.dreamstime.com/z/woman-basket-cleaning-equipment-smiling-african-holding-74155063.jpg" className="w-full h-full object-cover" alt="Staff 1" />
        </div>
        <div className="relative overflow-hidden rounded-[40px] shadow-2xl border-4 border-white -rotate-2 translate-y-4">
          <img src="https://hosawanos.com/wp-content/uploads/2019/02/woman-staff-cleaning.jpg" className="w-full h-full object-cover" alt="Staff 2" />
        </div>
      </div>

      <Suspense fallback={null}><BottomNav /></Suspense>
    </div>
  );
}
