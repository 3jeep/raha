"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { 
  collection, query, where, getDocs, doc, getDoc 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function WelcomePage() {
  const router = useRouter();
  const [mainPackages, setMainPackages] = useState<any[]>([]);
  const [specialPackages, setSpecialPackages] = useState<any[]>([]);
  const [laundryPrices, setLaundryPrices] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completedVisitsCount, setCompletedVisitsCount] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
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
      totalHours: String(pkg.totalHours || "4")
    });
    
    navigateTo("/checkout", params);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-right pb-10" dir="rtl">
      
      {/* Loading Overlay */}
      {isNavigating && (
        <div className="fixed top-0 left-0 w-full h-full z-[100] flex items-center justify-center bg-white/40 backdrop-blur-[2px]">
          <div className="bg-white p-6 rounded-[35px] shadow-2xl flex flex-col items-center gap-4 border border-blue-50">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[#1E293B] font-black text-sm italic animate-pulse">جاري التحميل...</span>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative h-[250px] w-full overflow-hidden rounded-b-[60px] shadow-2xl bg-[#1E293B]">
        <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQtPPMUccXWMhuLxq6N3F0X1KFhw7MLphrzj9ZxgkbeqGkzQl_g0CQT2ow&s=10" className="w-full h-full object-cover opacity-90" alt="Hero" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B] via-transparent to-transparent"></div>
        <div className="absolute top-12 right-8 flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-[25px] border border-white/20">
            <img src="/icon.png" className="w-10 h-10 rounded-xl" alt="Logo" />
            <span className="text-white font-black text-xl italic">راحة <span className="text-blue-400">RaHa</span></span>
        </div>
      </div>

      {/* Banner */}
      <div className="px-6 -translate-y-10">
        <div onClick={() => navigateTo("/packages")} className="bg-green-600 p-6 rounded-[35px] flex justify-between items-center shadow-xl active:scale-95 transition-all cursor-pointer border-b-4 border-green-800">
          <div className="flex items-center gap-3">
            <span className="text-white font-black text-sm italic">استكشف جميع عروضنا الآن</span>
            <div className="bg-white/20 p-2 rounded-full text-white text-xl rotate-180">→</div>
          </div>
          <div className="bg-white p-2 rounded-xl text-green-700 font-black text-xs">GO</div>
        </div>
      </div>

      <div className="px-6 space-y-6">
        <h3 className="text-[#1E293B] font-black text-2xl italic underline decoration-blue-500 decoration-4 underline-offset-8 px-2">خدمات راحة</h3>

        <div className="grid grid-cols-1 gap-5">
          {loading ? (
            <div className="h-28 bg-gray-200 animate-pulse rounded-[40px]"></div>
          ) : (
            <>
              {mainPackages.map((pkg) => (
                <div key={pkg.id} onClick={() => handleBooking(pkg)} className="bg-white p-4 rounded-[45px] border border-gray-100 shadow-xl flex justify-between items-center active:scale-[0.98] transition-all cursor-pointer">
                  <div className="flex items-center gap-4 flex-1">
                    <img src={pkg.image} className="w-20 h-20 bg-gray-50 rounded-[30px] object-cover border" alt={pkg.name} />
                    <div className="flex flex-col gap-1">
                      <span className="text-[#1E293B] font-black text-lg italic">{pkg.name}</span>
                      <p className="text-gray-400 text-[10px] font-bold line-clamp-1">{pkg.description}</p>
                      <span className="text-blue-600 font-black text-[11px]">{pkg.price} ج.س</span>
                    </div>
                  </div>
                  <div className="w-9 h-9 bg-[#1E293B] rounded-full flex items-center justify-center text-white rotate-180">→</div>
                </div>
              ))}

              {shouldShowLaundry() && (
                <div onClick={() => navigateTo("/checkout2")} className="bg-indigo-50/60 p-4 rounded-[45px] border border-indigo-100 shadow-xl flex justify-between items-center active:scale-[0.98] cursor-pointer">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-20 h-20 bg-white rounded-[30px] overflow-hidden border"><img src="https://wetndrylaundry.com/wp-content/uploads/2026/01/fast-delivery.png" className="w-full h-full object-cover" alt="Laundry" /></div>
                    <div className="flex flex-col gap-1"><span className="text-[#1E293B] font-black text-lg italic">غسيل دليفري</span><p className="text-indigo-900/60 text-[10px] font-bold italic line-clamp-1">استلام وتسليم دقيق واحترافي.</p></div>
                  </div>
                  <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center text-white rotate-180 shadow-lg">→</div>
                </div>
              )}

              {/* Special Packages Section */}
              {specialPackages.length > 0 && (
                <div className="pt-6">
                  <h4 className="text-[#1E293B] font-black text-md italic uppercase mb-4 px-2">🏆 عروض التميز</h4>
                  <div className="space-y-4">
                    {specialPackages.map((pkg) => {
                      const required = Number(pkg.minCompletedOrders || 0);
                      const isLocked = completedVisitsCount < required;

                      return (
                        <div key={pkg.id} 
                          onClick={() => handleBooking(pkg)} 
                          className={`relative overflow-hidden p-4 rounded-[45px] border-2 border-dashed flex justify-between items-center transition-all duration-500 
                          ${!isLocked ? 'bg-gradient-to-l from-white to-blue-50/40 border-blue-100 shadow-lg active:scale-95 cursor-pointer' 
                                      : 'bg-gray-100 border-gray-200 grayscale opacity-60 cursor-not-allowed pointer-events-none'}`}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="relative">
                               <img src={pkg.image} className="w-16 h-16 rounded-[25px] object-cover border-2 border-white shadow-sm" alt={pkg.name} />
                               {isLocked && <div className="absolute inset-0 bg-black/20 rounded-[25px] flex items-center justify-center text-white text-xs">🔒</div>}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-slate-800 font-black text-[14px] italic">{pkg.name}</span>
                              <div className="flex gap-4 mt-1">
                                 <span className="text-blue-600 font-black text-[11px]">{pkg.price} ج.س</span>
                                 {isLocked && (
                                   <span className="text-[7px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full italic">
                                     يفتح بعد {required} زيارة
                                   </span>
                                 )}
                              </div>
                            </div>
                          </div>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white rotate-180 shadow-md ${!isLocked ? 'bg-blue-600' : 'bg-gray-400'}`}>
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

      {/* Footer Images */}
      <div className="px-6 mt-12 grid grid-cols-2 gap-5 h-[180px]">
        <div className="relative overflow-hidden rounded-[40px] shadow-xl border-2 border-white rotate-2 transform">
          <img src="https://thumbs.dreamstime.com/z/woman-basket-cleaning-equipment-smiling-african-holding-74155063.jpg" className="w-full h-full object-cover" alt="Staff 1" />
        </div>
        <div className="relative overflow-hidden rounded-[40px] shadow-xl border-2 border-white -rotate-2 translate-y-4 transform">
          <img src="https://hosawanos.com/wp-content/uploads/2019/02/woman-staff-cleaning.jpg" className="w-full h-full object-cover" alt="Staff 2" />
        </div>
      </div>
    </div>
  );
}
