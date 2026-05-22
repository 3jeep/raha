"use client";

import { useState, useEffect, Suspense, lazy, useMemo } from "react";
import { db, auth } from "@/lib/firebase";
import { 
  collection, query, where, getDocs, doc, getDoc, onSnapshot 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

// --- 1. شريط التنقل السفلي الاحترافي المصمم بأبعاد ثابتة ومطابق للصفحات الأصلية ---
const BottomNav = lazy(() => Promise.resolve({ default: () => {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user || null);
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const isIncomplete = !userData.fullName || !userData.phone || !userData.region || !userData.address || !userData.gender;
          setIsProfileIncomplete(isIncomplete);
        }
      }
    });
    return () => unsubAuth();
  }, []);

  if (!currentUser) return null;

  const navItems = [
    { name: "الرئيسية", icon: "🏠", path: "/" },
    { name: "طلباتي", icon: "📋", path: "/my-bookings" }, 
    { name: "العروض", icon: "🏷️", path: "/packages" },
    { name: "حسابي", icon: "👤", path: "/profile", hasDot: isProfileIncomplete },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full bg-[#1E293B] h-20 shadow-2xl flex items-center justify-around px-2 z-50 rounded-t-[35px]">
      {navItems.map((item) => (
        <Link key={item.path} href={item.path} className={`flex flex-col items-center relative transition-all ${pathname === item.path ? 'scale-110 opacity-100 text-blue-400' : 'opacity-40 text-white'}`}>
          <span className="text-xl mb-1">{item.icon}</span>
          <span className="text-[10px] font-bold">{item.name}</span>
          {item.hasDot && (
            <span className="absolute top-0 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
          )}
        </Link>
      ))}
    </div>
  );
}}));

// --- 2. مكون الصفحة الرئيسية الشامل والمطابق تماماً لروابط وأبعاد كود الفلاتر الأصلي ---
export default function WelcomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [specialPackages, setSpecialPackages] = useState<any[]>([]);
  const [laundryPrices, setLaundryPrices] = useState<any>(null);
  const [cleaningPrices, setCleaningPrices] = useState<any>(null); 
  const [officialSinglePrice, setOfficialSinglePrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminType, setAdminType] = useState<string | null>(null);
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);
  const [completedVisitsCount, setCompletedVisitsCount] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  useEffect(() => {
    const cachedCleaning = localStorage.getItem("cached_cleaning_prices");
    const cachedLaundry = localStorage.getItem("cached_laundry_prices");
    const cachedRole = localStorage.getItem("userRole");
    const cachedAdminType = localStorage.getItem("adminType");

    if (cachedCleaning) {
      const parsed = JSON.parse(cachedCleaning);
      setCleaningPrices(parsed);
      setOfficialSinglePrice(Number(parsed?.single_price || 0));
    }
    if (cachedLaundry) setLaundryPrices(JSON.parse(cachedLaundry));
    if (cachedRole === "admin" || cachedRole === "manager" || cachedAdminType) {
      setIsAdmin(true);
      setAdminType(cachedAdminType);
    }
  }, []);

  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        setLoading(true);
        const qSpecial = query(collection(db, "packages"), where("showIn", "==", "special"));
        const [laundrySnap, cleaningSnap, specialSnap] = await Promise.all([
          getDoc(doc(db, "settings", "laundry_prices")),
          getDoc(doc(db, "settings", "cleaning_prices")),
          getDocs(qSpecial)
        ]);
        
        if (laundrySnap.exists()) {
          setLaundryPrices(laundrySnap.data());
          localStorage.setItem("cached_laundry_prices", JSON.stringify(laundrySnap.data()));
        }
        if (cleaningSnap.exists()) {
          setCleaningPrices(cleaningSnap.data());
          setOfficialSinglePrice(Number(cleaningSnap.data()?.single_price || 0));
          localStorage.setItem("cached_cleaning_prices", JSON.stringify(cleaningSnap.data()));
        }
        setSpecialPackages(specialSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { 
        console.error("Data fetching error:", e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchStaticData();
  }, []);

  useEffect(() => {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const qOrders = query(collection(db, "bookings"), where("userId", "==", currentUser.uid), where("status", "==", "completed"));
        
        const [userDoc, ordersSnap] = await Promise.all([
          getDoc(userRef),
          getDocs(qOrders)
        ]);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const role = userData.role;
          const aType = userData.adminType;

          localStorage.setItem("userRole", role);
          if (aType) localStorage.setItem("adminType", aType);

          if (role === "admin" || role === "manager" || aType === "super" || aType === "cleaning" || aType === "laundry") {
            setIsAdmin(true);
            setAdminType(aType || "super");
          } else {
            setIsAdmin(false);
            setAdminType(null);
          }

          if (!userData.fullName || !userData.phone || !userData.region || !userData.address || !userData.gender) {
            setIsProfileIncomplete(true);
          } else {
            setIsProfileIncomplete(false);
          }
        } else {
          setIsProfileIncomplete(true);
        }

        setCompletedVisitsCount(ordersSnap.size);

        const qNoti = query(collection(db, "users", currentUser.uid, "notifications"), where("isRead", "==", false));
        const unsubNoti = onSnapshot(qNoti, (snap) => setUnreadNotificationsCount(snap.size));
        
        listenToLiveOrders(userDoc.exists() ? userDoc.data().adminType : null, currentUser.uid);
      } else {
        localStorage.removeItem("userRole");
        localStorage.removeItem("adminType");
        setIsAdmin(false);
        setAdminType(null);
        setIsProfileIncomplete(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const listenToLiveOrders = (aType: string | null, userId: string) => {
    const screenInitTime = new Date();

    onSnapshot(collection(db, "bookings"), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        if (!data) return;
        const timeStamp = change.type === "added" ? data.createdAt : data.updatedAt;
        
        if (timeStamp && timeStamp.toDate().getTime() > screenInitTime.getTime()) {
          const orderId = change.doc.id.substring(0, 5);
          const clientName = data.userName || "عميل";
          const status = data.status || "";

          if (change.type === "added") {
            if ((aType === "super" || aType === "cleaning") && status === "pending") {
              alert(`طلب زيارة جديد 🏠\nقام ${clientName} بطلب خدمة جديدة (رقم ${orderId}). يرجى المراجعة والتأكيد.`);
            }
          } else if (change.type === "modified") {
            if (data.userId === userId) {
              if (status === "confirmed") alert(`تم تأكيد حجزك ✅\nعزيزي ${clientName}، تم تأكيد طلبك رقم ${orderId} بنجاح.`);
              if (status === "started") alert(`بدأ العمل الآن 🚀\nفريق راحة بدأ تنفيذ المهمة لطلبك رقم ${orderId}.`);
              if (status === "completed") alert(`تم إتمام المهمة ✨\nتم إتمام طلبك رقم ${orderId} بنجاح.`);
            }
          }
        }
      });
    });

    onSnapshot(collection(db, "laundry_orders"), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        if (!data) return;
        const timeStamp = change.type === "added" ? data.createdAt : data.updatedAt;

        if (timeStamp && timeStamp.toDate().getTime() > screenInitTime.getTime()) {
          const orderId = change.doc.id.substring(0, 5);
          const status = data.status || "";
          const clientName = data.userName || "عميل";

          if (change.type === "added") {
            if ((aType === "super" || aType === "laundry") && status === "pending") {
              alert(`طلب غسيل جديد 🧺\nوصل طلب غسيل جديد من العميل ${clientName} (رقم ${orderId}).`);
            }
          } else if (change.type === "modified") {
            if (data.userId === userId) {
              if (status === "received") alert(`استلام ناجح 🧺\nتم استلام ملابسك للطلب ${orderId}.`);
              if (status === "out_for_delivery") alert(`ملابسك في طريقها إليك 🚚\nتم تجهيز الطلب ${orderId} والمندوب في الطريق.`);
              if (status === "completed") alert(`تم التسليم ✨\nسعدنا بخدمتكم! تم تسليم ملابسك للطلب رقم ${orderId}.`);
            }
          }
        }
      });
    });
  };

  // شاشة الانتظار عند جلب البيانات من فايربيس لأول مرة
  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-between bg-[#1E293B] font-['Cairo'] text-white p-10" dir="rtl">
        <div className="flex flex-col items-center justify-center flex-1 gap-6">
          <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-[30px] flex items-center justify-center shadow-2xl animate-pulse overflow-hidden p-4">
            <img 
              src="/images/logo.png" 
              className="w-full h-full object-contain" 
              alt="تطبيق راحة" 
            />
          </div>
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-2xl font-black font-['Aljazeera'] tracking-wide">تطبيق راحة</h2>
            <p className="text-white/60 text-xs tracking-widest animate-bounce">جاري جلب البيانات...</p>
          </div>
        </div>

        <div className="w-full max-w-xs flex flex-col items-center gap-3 pb-8">
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden relative">
            <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full w-1/2 absolute top-0 left-0 animate-[shimmer_1.5s_infinite_linear]" 
                 style={{
                   animationName: 'shimmer',
                   animationDuration: '1.5s',
                   animationIterationCount: 'infinite',
                   animationTimingFunction: 'linear'
                 }}
            ></div>
          </div>
          <span className="text-[10px] text-white/40 font-bold tracking-tight">يرجى الانتظار قليلاً</span>
        </div>

        <style jsx>{`
          @keyframes shimmer {
            0% { transform: translateX(-150%); }
            50% { transform: translateX(0%); }
            100% { transform: translateX(150%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-['Cairo'] text-right pb-40 select-none antialiased" dir="rtl">
      
      {isNavigating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl flex flex-col items-center gap-4 border-2 border-blue-100">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-900 font-black text-sm italic">جاري التحميل...</span>
          </div>
        </div>
      )}

      {/* لوحة الإدارة والاشراف العائمة */}
      {isAdmin && (
        <div className="fixed top-24 left-6 z-[60] animate-bounce">
          <button 
            onClick={() => { setIsNavigating(true); router.push("/admin/access"); }} 
            className="bg-red-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center border-4 border-white active:scale-90 font-black text-[10px] italic uppercase"
          >
            الإشراف
          </button>
        </div>
      )}

      {/* الهيرو كارد المعدل - صورة واضحة 100% وخلفية نص شفافة تظهر الخلفية بالكامل */}
      <div className="relative h-[220px] w-full overflow-hidden rounded-bl-[60px] shadow-2xl bg-[#1E293B]">
        {/* الصورة واضحة تماماً وبدون أي تأثير دمج أو عتمة هيدر */}
        <img 
          src="/images/hero_bg.jpg" 
          className="absolute inset-0 w-full h-[150%] object-cover object-bottom opacity-100 z-0" 
          alt="Hero Background" 
          fetchPriority="high"
          loading="eager"
        />
        
        {/* الصندوق العائم بنسبة شفافية سوداء ناعمة تظهر ما خلفها من تفاصيل الصورة بوضوح تاري وبدون ضبابية */}
        <div className="absolute inset-x-6 top-10 bg-black/40 p-4 px-5 rounded-[25px] flex justify-between items-center z-10 border border-white/20 shadow-xl">
          <div className="flex flex-col text-white space-y-1">
            <span className="text-white text-[14px] font-bold drop-shadow-md">راحة : الحل الذكي لراحتك</span>
            <span className="text-xs font-black font-['Aljazeera'] text-white drop-shadow-md">للحلول الذكية والموارد البشرية</span>
          </div>

          <div className="relative cursor-pointer bg-black/30 p-2 rounded-full border border-white/20 shadow-inner" onClick={() => router.push("/notifications")}>
            <span className="text-xl text-white block">🔔</span>
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-[#1E293B]">
                {unreadNotificationsCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* بانر إكمال الملف الشخصي */}
      {isProfileIncomplete && (
        <div className="mx-[25px] mt-5 p-[12px] px-[15px] bg-red-50 border border-red-100 rounded-[20px] flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-red-500 text-xl">⚠️</span>
            <p className="text-red-600 text-[11px] font-bold leading-tight">أكمل بيانات صفحة البروفايل لتواصل أسهل وخدمة أسرع ✨</p>
          </div>
          <button 
            onClick={() => router.push("/profile")}
            className="text-blue-600 text-[11px] font-black shrink-0 mr-2 hover:underline"
          >
            أكمل الآن
          </button>
        </div>
      )}

      {/* كارد البحث والتحرك السريع للحرفيين */}
      <div className="px-[25px] -translate-y-5">
        <div 
          onClick={() => { setIsNavigating(true); router.push("/handymen"); }} 
          className="w-full bg-white p-5 rounded-[30px] flex items-center shadow-lg active:scale-95 transition-all cursor-pointer"
        >
          <div className="bg-[#EEF2FF] w-[50px] h-[50px] rounded-full flex items-center justify-center shrink-0">
             <span className="text-blue-600 text-xl">🛠️</span>
          </div>
          <div className="flex flex-col justify-center space-y-0.5 mr-[15px]">
            <span className="text-gray-400 font-bold text-xs">بتفتش في شنو?!</span>
            <span className="text-[#1E293B] font-black text-xs font-['Aljazeera']">بالخريطه اطلب اقرب حرفي</span>
          </div>
          <div className="mr-auto flex items-center gap-2">
            <span className="bg-emerald-300 text-black text-[9px] font-black px-2.5 py-1 rounded-[10px] whitespace-nowrap"> 100% مجاني </span>
            <span className="text-gray-400 text-xs font-black">←</span>
          </div>
        </div>
      </div>

      {/* قسم الخدمات الاحترافية */}
      <div className="px-[25px] space-y-[15px] mt-4">
        <h3 className="text-[#1E293B] font-black text-[18px] font-['Aljazeera'] px-1.5">الخدمات الاحترافية</h3>

        <div 
          onClick={() => { setIsNavigating(true); router.push("/singleout?type=single"); }}
          className="w-full p-[22px] bg-gradient-to-bl from-[#1E293B] to-[#673AB7] rounded-[40px] flex justify-between items-center shadow-lg cursor-pointer active:scale-98 transition-all"
        >
          <div className="flex flex-col text-white space-y-1 pl-4">
            <h3 className="text-xl font-black font-['Aljazeera']">زيارة منزلية مفردة</h3>
            <p className="text-white/70 text-[11px] font-bold">✨ زيارة لمرة واحدة فقط، شاملة المعدات وعاملة مدربة لإنجاز مهامك المتعبة</p>
          </div>
          <div className="w-[50px] h-[50px] bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm text-xl">✨</div>
        </div>

        <div 
          onClick={() => { setIsNavigating(true); router.push("/RahaContract?type=multi"); }}
          className="w-full p-[22px] bg-gradient-to-bl from-[#1E293B] to-[#3F51B5] rounded-[40px] flex justify-between items-center shadow-lg cursor-pointer active:scale-98 transition-all"
        >
          <div className="flex flex-col text-white space-y-1 pl-4">
            <h3 className="text-xl font-black font-['Aljazeera']">تعاقد الزيارات المتعددة</h3>
            <p className="text-white/70 text-[11px] font-bold">📦 اشتري راحتك بجدول ثابت.. توفير أكتر، مجهود أقل، وضمان نظافة بيتك بانتظام</p>
          </div>
          <div className="w-[50px] h-[50px] bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm text-xl">📦</div>
        </div>

        <div 
          onClick={() => { setIsNavigating(true); router.push("/checkout2"); }}
          className="w-full p-[22px] bg-gradient-to-bl from-[#1E293B] to-[#2196F3] rounded-[40px] flex justify-between items-center shadow-lg cursor-pointer active:scale-98 transition-all"
        >
          <div className="flex flex-col text-white space-y-1 pl-4">
            <h3 className="text-xl font-black font-['Aljazeera']">غسيل الملابس (دليفري)</h3>
            <p className="text-white/70 text-[11px] font-bold">🧺 استلام وتسليم :خليك دايماً قيافة.. هدومك بتجيك مكوية وجاهزة، ومن غير مشوار</p>
          </div>
          <div className="w-[50px] h-[50px] bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm text-xl">🧺</div>
        </div>
      </div>

      {/* قسم العروض الحصرية الأفقية */}
      <div className="mt-8 space-y-3">
        <h3 className="text-[#1E293B] font-black text-[18px] font-['Aljazeera'] px-[30px]">أقوى العروض الحصرية 🔥</h3>
        
        <div className="flex gap-[15px] overflow-x-auto pb-4 pt-1 px-5 scrollbar-none snap-x snap-mandatory text-right" style={{ scrollbarWidth: 'none' }}>
          {specialPackages.map((pkg) => {
            const required = parseInt(pkg.minCompletedOrders || "0", 10);
            const isLocked = completedVisitsCount < required;
            const offerPrice = parseFloat(pkg.price || "0");
            
            let discountBadge = "";
            if (officialSinglePrice > 0 && offerPrice > 0) {
              const discount = ((officialSinglePrice - offerPrice) / officialSinglePrice) * 100;
              if (discount > 0) discountBadge = `${discount.toFixed(0)}%`;
            }

            return (
              <div 
                key={pkg.id} 
                onClick={() => {
                  if (isLocked) {
                    alert(`هذا العرض يتطلب ${required} زيارات مكتملة. (لديك حالياً: ${completedVisitsCount})`);
                    return;
                  }
                  setIsNavigating(true);
                  router.push(`/checkout?id=${pkg.id}`);
                }} 
                className="w-[280px] h-[200px] rounded-[30px] p-5 flex flex-col justify-between shadow-md text-white relative overflow-hidden shrink-0 snap-start"
                style={pkg.image ? { 
                  backgroundImage: `linear-gradient(${isLocked ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0)'}, ${isLocked ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0)'}), url('${pkg.image}')`, 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center' 
                } : {
                  backgroundImage: isLocked 
                    ? "linear-gradient(to bottom right, #4B5563, #111827)" 
                    : "linear-gradient(to bottom right, #3B82F6, #1E40AF)"
                }}
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-black text-[16px] leading-tight font-['Aljazeera'] truncate max-w-[180px]">{pkg.name || "عرض حصري"}</span>
                    {discountBadge && !isLocked ? (
                      <span className="bg-red-500 text-[10px] px-2.5 py-1 rounded-[12px] font-black whitespace-nowrap shrink-0">خصم {discountBadge}</span>
                    ) : (
                      <span className="text-base shrink-0">{isLocked ? '🔒' : '🏷️'}</span>
                    )}
                  </div>
                  <p className="text-white/70 text-[11px] font-medium mt-1.5 line-clamp-2 leading-relaxed">{pkg.description}</p>
                </div>
                
                <div className="space-y-1">
                  {!isLocked && offerPrice > 0 && (
                    <span className="text-amber-400 font-black text-sm block">السعر الحالي: {offerPrice.toFixed(0)} ج.س</span>
                  )}
                  <span className="text-[12px] font-black block text-white/90">
                    {isLocked ? `🏆 يتطلب ${required} زيارة لفتحه` : "احجز الآن واستفد من الخصم"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showInstallBtn && (
        <div className="px-6 mt-14">
           <button onClick={() => deferredPrompt?.prompt()} className="w-full bg-gray-900 text-white py-[18px] rounded-[35px] font-black text-xs shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">تثبيت تطبيق "راحة" لخدمة أسرع 📱</button>
        </div>
      )}

      <Suspense fallback={null}><BottomNav /></Suspense>
    </div>
  );
}
