"use client";
import { useState, useEffect, Suspense, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isInitialMount = useRef(false);

  // جلب البيانات من الرابط
  const pkgName = searchParams.get("pkgName");
  const pkgPrice = searchParams.get("pkgPrice");
  const pkgCategory = searchParams.get("category") || "single";
  const pkgHours = searchParams.get("hours") || "4"; 
  const rawDuration = searchParams.get("duration");
  const pkgDuration = pkgCategory === "single" ? null : (rawDuration || "1 شهر");
  const pkgDescription = searchParams.get("description") || "خدمة منزلية احترافية تضمن لك الراحة والنظافة التامة.";
  const pkgImage = searchParams.get("image") || "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1000";

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "requesting" | "success" | "error">("idle");
  
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    gender: "female", 
    startDate: "",        
    locationText: "",    
    locationCoords: null as { lat: number, lng: number } | null,
    packageName: pkgName || "",
    price: pkgPrice || "0",
    category: pkgCategory,
    status: "pending"
  });

  // دالة مخرج الطوارئ للعودة للرئيسية ومسح سجل التوجيه
  const goToHome = () => router.replace("/");

  useEffect(() => {
    if (!pkgName || !pkgPrice) {
      router.replace("/"); 
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        // توجيه لتسجيل الدخول مع حفظ رابط العودة
        router.push(`/login?redirect=${encodeURIComponent(window.location.href)}`);
        return;
      }

      setUser(currentUser);

      if (!isInitialMount.current) {
        isInitialMount.current = true;
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setFormData(prev => ({
              ...prev,
              fullName: data.fullName || "",
              phone: data.phone || "",
              locationText: data.address || ""
            }));
          }
        } catch (err) {
          console.error("Firestore Fetch Error:", err);
        }

        if (navigator.geolocation) {
          setGpsStatus("requesting");
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setFormData(prev => ({
                ...prev,
                locationCoords: { lat: pos.coords.latitude, lng: pos.coords.longitude }
              }));
              setGpsStatus("success");
            },
            (err) => {
              setGpsStatus("error");
            },
            { enableHighAccuracy: true, timeout: 15000 }
          );
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [pkgName, pkgPrice, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.phone || !formData.fullName || !formData.startDate) {
      return alert("⚠️ يرجى إكمال البيانات الأساسية");
    }

    setIsSubmitting(true);

    try {
      await addDoc(collection(db, "bookings"), {
        ...formData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        totalHours: Number(pkgHours),
        ...(pkgDuration && { duration: pkgDuration })
      });

      alert("✅ تم إرسال طلبك بنجاح!");
      
      // استخدام replace لضمان عدم العودة لهذه الصفحة عند ضغط زر الرجوع
      router.replace("/my-chekout");
    } catch (err) {
      console.error("Submission Error:", err);
      alert("❌ حدث خطأ، يرجى المحاولة لاحقاً");
      setIsSubmitting(false);
    }
  };

  if (loading || !pkgName) return (
    <div className="h-screen flex items-center justify-center font-black text-sm italic animate-pulse text-blue-600">
      جاري التحقق من تفاصيل العرض...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-right font-sans" dir="rtl">
      
      {/* الهيدر المطور بأزرار تحكم ذكية */}
      <div className="relative h-[230px] w-full overflow-hidden rounded-b-[45px] shadow-xl flex items-center justify-center">
        <img src={pkgImage} className="absolute inset-0 w-full h-full object-cover" alt="Header" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B] via-[#1E293B]/80 to-transparent"></div>

        <div className="relative z-10 text-center px-6 pt-2">
            <div className="inline-flex items-baseline gap-1 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-xl border border-white/10 mb-2">
                <h1 className="text-3xl font-black text-white italic">{pkgPrice}</h1>
                <span className="text-[9px] font-bold text-blue-300">ج.س</span>
            </div>
            <h2 className="text-md font-black text-white italic drop-shadow-md">{pkgName}</h2>
            
            <div className="flex justify-center gap-2 mt-2">
              <span className="bg-blue-500/40 backdrop-blur-md text-white text-[9px] font-black px-3 py-1.5 rounded-xl border border-white/10">
                🕒 {pkgHours} ساعات
              </span>
              {pkgDuration && (
                <span className="bg-green-500/40 backdrop-blur-md text-white text-[9px] font-black px-3 py-1.5 rounded-xl border border-white/10">
                  📅 {pkgDuration}
                </span>
              )}
            </div>
        </div>

        {/* زر الرجوع التقليدي */}
        <button type="button" onClick={() => router.back()} className="absolute top-10 right-6 w-9 h-9 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white transition-active active:scale-90">
          →
        </button>

        {/* زر مخرج الطوارئ للرئيسية */}
        <button type="button" onClick={goToHome} className="absolute top-10 left-6 px-4 h-9 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white text-[10px] font-black italic">
          الرئيسية 🏠
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-6 mt-6 space-y-4 max-w-lg mx-auto">
        <div className="bg-white p-5 rounded-[30px] shadow-sm border border-gray-50">
          <label className="text-[10px] font-black text-gray-400 block mb-3 italic">تحديد جنس المستلم:</label>
          <div className="grid grid-cols-2 gap-3">
            <button disabled={isSubmitting} type="button" onClick={() => setFormData({...formData, gender: "female"})} className={`py-3 rounded-2xl text-[10px] font-black transition-all ${formData.gender === 'female' ? 'bg-pink-50 text-pink-600 border border-pink-100' : 'bg-gray-50 text-gray-400'}`}>👩 أنثى</button>
            <button disabled={isSubmitting} type="button" onClick={() => setFormData({...formData, gender: "male"})} className={`py-3 rounded-2xl text-[10px] font-black transition-all ${formData.gender === 'male' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-50 text-gray-400'}`}>👨 ذكر</button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[35px] shadow-sm border border-gray-50 space-y-4">
          <input disabled={isSubmitting} required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="الاسم الكامل" className="w-full p-4 rounded-xl bg-gray-50 text-xs font-black outline-none" />
          <input disabled={isSubmitting} required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="رقم الهاتف" className="w-full p-4 rounded-xl bg-gray-50 text-xs font-black outline-none text-left" dir="ltr" />
          <div className="pt-2">
            <label className="text-[10px] font-black text-blue-600 block mb-2 italic">تاريخ الموعد المطلوب:</label>
            <input disabled={isSubmitting} required type="date" min={new Date().toISOString().split('T')[0]} value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full p-4 rounded-xl bg-blue-50/50 text-xs font-black outline-none" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[35px] shadow-sm border border-gray-100 space-y-3">
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] font-black text-gray-400 italic">العنوان والموقع:</label>
            <div className={`px-3 py-1.5 rounded-full text-[8px] font-black ${
              gpsStatus === "success" ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
            }`}>
               {gpsStatus === "success" ? "تم تحديد الموقع ✅" : "ادخل العنوان يدوياً 📍"}
            </div>
          </div>
          <textarea disabled={isSubmitting} required value={formData.locationText} onChange={e => setFormData({...formData, locationText: e.target.value})} placeholder="الحي، الشارع، المعالم القريبة..." className="w-full p-4 rounded-xl bg-gray-50 text-xs font-bold outline-none h-24 resize-none leading-relaxed" />
        </div>

        <div className="pt-2 space-y-3">
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className={`w-full py-5 rounded-[30px] font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
                isSubmitting ? 'bg-gray-400 opacity-70' : 'bg-[#1E293B] text-white active:scale-95'
              }`}
            >
                {isSubmitting ? "جاري الحفظ..." : "تأكيد حجز الخدمة 🚀"}
            </button>
            <button 
              type="button" 
              disabled={isSubmitting} 
              onClick={goToHome} 
              className="w-full py-4 rounded-[30px] font-black text-[10px] text-red-400 bg-red-50/30 border border-red-100 active:scale-95"
            >
              إلغاء الطلب والعودة للرئيسية
            </button>
        </div>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center font-black text-xs text-gray-300 italic">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
