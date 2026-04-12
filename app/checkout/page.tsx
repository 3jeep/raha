"use client";
import { useState, useEffect, Suspense, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import { 
  collection, addDoc, serverTimestamp, doc, getDoc, getDocs, query, where, onSnapshot 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
// استيراد الدوال من ملف utils الخاص بك
import { showToast, runSafe, getCurrentGPSLocation, isValidSudanesePhone } from "@/lib/utils";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isInitialMount = useRef(false);

  const pkgId = searchParams.get("id");

  const [pkg, setPkg] = useState<any>(null); 
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true); // لغرض التحميل الأولي
  const [isSubmitting, setIsSubmitting] = useState(false); // لغرض زر الإرسال
  const [gpsStatus, setGpsStatus] = useState<"idle" | "requesting" | "success" | "error">("idle");
  
  const [isDayFull, setIsDayFull] = useState(false);
  const [totalMaidsCount, setTotalMaidsCount] = useState(0);
  const [adminFullDays, setAdminFullDays] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    gender: "female", 
    startDate: "",        
    locationText: "",    
    locationCoords: null as { lat: number, lng: number } | null,
    packageName: "",
    price: "0",
    category: "single",
    status: "pending"
  });

  const goToHome = () => router.replace("/");

  // 1. جلب بيانات العرض (استخدام جلب مباشر لضمان الأمان)
  useEffect(() => {
    if (!pkgId) {
      showToast("⚠️ رابط غير مكتمل", "error");
      return goToHome();
    }
    const fetchPackageData = async () => {
      try {
        const docSnap = await getDoc(doc(db, "packages", pkgId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPkg({ id: docSnap.id, ...data });
          setFormData(prev => ({
            ...prev,
            packageName: data.name || "",
            price: data.price || "0",
            category: data.category || "single"
          }));
        } else {
          showToast("❌ العرض غير متوفر حالياً", "error");
          goToHome();
        }
      } catch (err) {
        showToast("🌐 فشل الاتصال بالخادم", "error");
      }
    };
    fetchPackageData();
  }, [pkgId]);

  // 2. إدارة المستخدم والموقع الجغرافي باستخدام دالة getCurrentGPSLocation من utils
  useEffect(() => {
    const fetchData = async () => {
      const maidsSnap = await getDocs(collection(db, "maids"));
      setTotalMaidsCount(maidsSnap.size);
    };
    fetchData();

    const unsubAdminDays = onSnapshot(doc(db, "settings", "availability"), (docSnap) => {
      if (docSnap.exists()) setAdminFullDays(docSnap.data().fullDays || []);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push(`/login?redirect=${encodeURIComponent(window.location.href)}`);
        return;
      }
      setUser(currentUser);

      if (!isInitialMount.current) {
        isInitialMount.current = true;
        
        // جلب بيانات البروفايل وتحديد الموقع
        await runSafe(setLoading, async () => {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setFormData(prev => ({
              ...prev,
              fullName: data.fullName || "",
              phone: data.phone || "",
              locationText: data.address || data.locationText || ""
            }));
          }

          // استخدام دالة الـ GPS من الـ utils الخاصة بك
          try {
            setGpsStatus("requesting");
            const coords = await getCurrentGPSLocation();
            setFormData(prev => ({ ...prev, locationCoords: coords }));
            setGpsStatus("success");
          } catch (e) {
            setGpsStatus("error");
          }
        });
      }
    });

    return () => { unsubscribeAuth(); unsubAdminDays(); };
  }, [router]);

  // 3. فحص التوفر
  useEffect(() => {
    const checkAvailability = async () => {
      if (formData.startDate) {
        if (adminFullDays.includes(formData.startDate)) {
          setIsDayFull(true);
          return;
        }
        if (totalMaidsCount > 0) {
          const q = query(collection(db, "bookings"), where("startDate", "==", formData.startDate), where("status", "!=", "cancelled"));
          const querySnapshot = await getDocs(q);
          setIsDayFull(querySnapshot.size >= totalMaidsCount);
        }
      }
    };
    checkAvailability();
  }, [formData.startDate, totalMaidsCount, adminFullDays]);

  // 4. معالجة الإرسال باستخدام runSafe و isValidSudanesePhone
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isDayFull) return;

    // التحقق من الرقم باستخدام دالتك في utils
    if (!isValidSudanesePhone(formData.phone)) return;

    if (!formData.fullName || !formData.startDate || !formData.locationText) {
      return showToast("⚠️ يرجى إكمال الحقول الأساسية", "info");
    }

    // استخدام runSafe لإدارة حالة الـ Loading والاتصال بالإنترنت
    await runSafe(setIsSubmitting, async () => {
      await addDoc(collection(db, "bookings"), {
        ...formData,
        userId: user.uid,
        email: user.email, 
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        totalHours: Number(pkg?.totalHours || pkg?.hours || 4),
        ...(pkg?.duration && { duration: pkg.duration })
      });
      showToast("🚀 تم حجز موعدك بنجاح!");
      router.replace("/my-chekout");
    });
  };

  if (loading || !pkg) return (
    <div className="h-screen flex items-center justify-center font-black text-sm italic animate-pulse text-blue-600">
      جاري تحضير طلبك...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-right font-sans" dir="rtl">
      
      {/* Header Section */}
      <div className="relative h-[230px] w-full overflow-hidden rounded-b-[45px] shadow-xl flex items-center justify-center">
        <img src={pkg.image || "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1000"} className="absolute inset-0 w-full h-full object-cover" alt="Header" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B] via-[#1E293B]/80 to-transparent"></div>

        <button type="button" onClick={goToHome} className="absolute top-10 left-6 px-4 h-9 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white text-[10px] font-black z-20 active:scale-90">
          الرئيسية 🏠
        </button>

        <div className="relative z-10 text-center px-6 pt-2">
            <div className="inline-flex items-baseline gap-1 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-xl border border-white/10 mb-2">
                <h1 className="text-3xl font-black text-white italic">{pkg.price}</h1>
                <span className="text-[9px] font-bold text-blue-300">ج.س</span>
            </div>
            <h2 className="text-md font-black text-white italic">{pkg.name}</h2>
            <div className="flex justify-center gap-2 mt-2">
              <span className="bg-blue-500/40 backdrop-blur-md text-white text-[9px] font-black px-3 py-1.5 rounded-xl border border-white/10">🕒 {pkg.totalHours || pkg.hours || 4} ساعات</span>
              {pkg.duration && <span className="bg-green-500/40 backdrop-blur-md text-white text-[9px] font-black px-3 py-1.5 rounded-xl border border-white/10">📅 {pkg.duration}</span>}
            </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-6 mt-6 space-y-4 max-w-lg mx-auto">
        
        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 mb-2 text-center">
           <p className="text-[10px] font-black text-blue-900 leading-relaxed italic">{pkg.description || "خدمة منزلية احترافية تضمن لك الراحة والنظافة التامة."}</p>
        </div>

        <div className="bg-white p-5 rounded-[30px] shadow-sm border border-gray-50">
          <label className="text-[10px] font-black text-gray-900 block mb-3 italic">تحديد جنس المستلم:</label>
          <div className="grid grid-cols-2 gap-3">
            <button disabled={isSubmitting} type="button" onClick={() => setFormData({...formData, gender: "female"})} className={`py-3 rounded-2xl text-[10px] font-black transition-all ${formData.gender === 'female' ? 'bg-pink-50 text-pink-600 border border-pink-100' : 'bg-gray-50 text-gray-900'}`}>👩 أنثى</button>
            <button disabled={isSubmitting} type="button" onClick={() => setFormData({...formData, gender: "male"})} className={`py-3 rounded-2xl text-[10px] font-black transition-all ${formData.gender === 'male' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-50 text-gray-900'}`}>👨 ذكر</button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[35px] shadow-sm border border-gray-50 space-y-4">
          <input disabled={isSubmitting} required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="الاسم الكامل" className="w-full p-4 rounded-xl bg-gray-50 text-xs font-black outline-none" />
          <input disabled={isSubmitting} required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="رقم الهاتف (09xxxxxxxx)" className="w-full p-4 rounded-xl bg-gray-50 text-xs font-black outline-none text-left" dir="ltr" />
          
          <div className="pt-2">
            <label className="text-[10px] font-black text-blue-900 block mb-2 italic">تاريخ الموعد المطلوب:</label>
            <input 
              disabled={isSubmitting} 
              required 
              type="date" 
              min={new Date().toISOString().split('T')[0]} 
              value={formData.startDate} 
              onChange={e => setFormData({...formData, startDate: e.target.value})} 
              className={`w-full p-4 rounded-xl text-xs font-black outline-none transition-all ${isDayFull ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50/50 text-gray-900'}`} 
            />
            {isDayFull && (
              <p className="text-red-500 text-[8px] font-black mt-2 text-center animate-pulse">
                ⚠️ عذراً، هذا اليوم مكتمل الحجوزات.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-[35px] shadow-sm border border-gray-100 space-y-3">
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] font-black text-gray-900 italic">العنوان والموقع:</label>
            <div className={`px-3 py-1.5 rounded-full text-[8px] font-black ${gpsStatus === "success" ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
               {gpsStatus === "success" ? "الموقع محدد ✅" : "أدخل العنوان 📍"}
            </div>
          </div>
          <textarea disabled={isSubmitting} required value={formData.locationText} onChange={e => setFormData({...formData, locationText: e.target.value})} placeholder="الحي، الشارع، المعالم القريبة..." className="w-full p-4 rounded-xl bg-gray-50 text-xs font-bold outline-none h-24 resize-none leading-relaxed" />
        </div>

        <div className="pt-2 space-y-3">
            {!isDayFull ? (
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className={`w-full py-5 rounded-[30px] font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'bg-gray-400 opacity-70' : 'bg-[#1E293B] text-white active:scale-95'}`}
              >
                  {isSubmitting ? "جاري المعالجة..." : "تأكيد الحجز الآن 🚀"}
              </button>
            ) : (
              <div className="w-full py-5 rounded-[30px] bg-gray-200 text-gray-500 font-black text-xs text-center border border-gray-300">
                 نأسف، التاريخ غير متوفر ⛔
              </div>
            )}
            
            <button type="button" disabled={isSubmitting} onClick={goToHome} className="w-full py-4 rounded-[30px] font-black text-[10px] text-red-400 bg-red-50/30 border border-red-100 active:scale-95">
              إلغاء والعودة
            </button>
        </div>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center font-black text-xs text-gray-900 italic">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
