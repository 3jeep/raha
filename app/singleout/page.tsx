"use client";
import React, { useState, useEffect, Suspense } from "react";
import { db, auth } from "@/lib/firebase";
import { 
  collection, addDoc, serverTimestamp, doc, getDoc, getDocs, query, where, onSnapshot 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { 
  User, Calendar, MapPin, CheckCircle2, Loader2, Info, Clock, ArrowRight
} from "lucide-react";
import { showToast, runSafe, getCurrentGPSLocation, isValidSudanesePhone } from "@/lib/utils";

function CheckoutContent() {
  const router = useRouter();

  // --- States ---
  const [step, setStep] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  
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
    packageName: "زيارة مفردة - 5 ساعات",
    price: "0", 
    category: "single",
    status: "pending"
  });

  // --- Logic & Effects ---
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, "settings", "cleaning_prices"));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setFormData(prev => ({
            ...prev,
            price: data?.single_price || "0" 
          }));
        }

        const maidsSnap = await getDocs(collection(db, "maids"));
        setTotalMaidsCount(maidsSnap.size);

        onSnapshot(doc(db, "settings", "availability"), (docSnap) => {
          if (docSnap.exists()) setAdminFullDays(docSnap.data().fullDays || []);
        });

      } catch (err) {
        console.error("Error fetching price:", err);
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push(`/login`);
        return;
      }
      setUser(currentUser);
      
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
      setLoading(false);
    });

    fetchInitialData();
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    const checkAvailability = async () => {
      if (formData.startDate) {
        if (adminFullDays.includes(formData.startDate)) {
          setIsDayFull(true);
          return;
        }
        const q = query(collection(db, "bookings"), where("startDate", "==", formData.startDate), where("status", "!=", "cancelled"));
        const querySnapshot = await getDocs(q);
        setIsDayFull(querySnapshot.size >= totalMaidsCount);
      }
    };
    checkAvailability();
  }, [formData.startDate, totalMaidsCount, adminFullDays]);

  // --- التعديل هنا لطلب الإذن ومعالجة الحظر ---
  const handleGetLocation = async () => {
    setLocating(true);
    try {
      const coords = await getCurrentGPSLocation();
      setFormData(prev => ({ 
        ...prev, 
        locationCoords: coords,
        locationText: prev.locationText + `\n📍 الموقع محدد عبر GPS`
      }));
      showToast("📍 تم تحديد موقعك بنجاح", "success");
    } catch (e: any) {
      // رسالة تنبيهية في حال تم حظر الإذن من المتصفح
      if (e.code === 1 || e.message?.includes("denied")) {
        showToast("⚠️ الموقع محظور! يرجى السماح بالوصول للموقع من إعدادات المتصفح (أيقونة القفل 🔒) لتأكيد الحجز", "error");
      } else {
        showToast("❌ فشل تحديد الموقع، تأكد من فتح الـ GPS", "error");
      }
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (isDayFull) return showToast("⚠️ اليوم المختار مكتمل", "error");
    if (!isValidSudanesePhone(formData.phone)) return;

    await runSafe(setIsSubmitting, async () => {
      await addDoc(collection(db, "bookings"), {
        ...formData,
        userId: user.uid,
        email: user.email, 
        createdAt: serverTimestamp(),
        totalHours: 5, 
      });
      showToast("🚀 تم حجز موعدك بنجاح!");
      router.replace("/my-chekout");
    });
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white gap-4 font-black text-blue-600">
      <Loader2 className="animate-spin" size={40} />
      <p className="italic text-sm">جاري تحضير طلبك...</p>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-right" dir="rtl">
      
      {/* Header */}
      <div className="bg-[#1E293B] text-white p-6 rounded-b-[40px] shadow-lg shrink-0 z-10 relative overflow-hidden">
        <div className="relative z-10">
            <h1 className="text-xl font-black italic">طلب زيارة مفردة ✨</h1>
            <p className="text-[10px] text-blue-300 font-bold mt-1">خدمة الـ 5 ساعات</p>
            <div className="flex gap-2 mt-4">
            {[1, 2].map((s) => (
                <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-blue-500' : 'bg-slate-700'}`} />
            ))}
            </div>
        </div>
        <div className="absolute top-[-20px] left-[-20px] w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-6 rounded-[35px] border border-slate-200 shadow-sm flex justify-between items-center">
                <div>
                    <span className="text-[10px] font-black text-slate-400 block italic uppercase">تكلفة الخدمة</span>
                    <span className="text-2xl font-black text-slate-800 italic">{formData.price} <small className="text-[10px]">ج.س</small></span>
                </div>
                <div className="text-left font-black text-blue-600 italic">
                    🕒 5 ساعات
                </div>
            </div>

            <div className="bg-white p-6 rounded-[35px] border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-black text-xs flex items-center gap-2 text-slate-800 italic"> <User size={16} className="text-blue-600"/> البيانات الأساسية</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setFormData({...formData, gender: "female"})} className={`py-4 rounded-2xl text-[14px] font-black border transition-all ${formData.gender === 'female' ? 'bg-pink-50 text-pink-600 border-pink-100' : 'bg-slate-50 text-slate-400 border-transparent'}`}>👩 أنثى</button>
                <button type="button" onClick={() => setFormData({...formData, gender: "male"})} className={`py-4 rounded-2xl text-[14px] font-black border transition-all ${formData.gender === 'male' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400 border-transparent'}`}>👨 ذكر</button>
              </div>

              <input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="الاسم الكامل" className="w-full p-4 rounded-2xl bg-slate-50 text-xs font-black outline-none border focus:border-blue-400" />
              <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="رقم الهاتف" className="w-full p-4 rounded-2xl bg-slate-50 text-xs font-black outline-none text-left" dir="ltr" />
              
              <div className="pt-2">
                <label className="text-[10px] font-black text-slate-400 block mb-2 mr-2 italic">تاريخ الزيارة:</label>
                <input 
                  type="date" 
                  min={new Date().toISOString().split('T')[0]} 
                  value={formData.startDate} 
                  onChange={e => setFormData({...formData, startDate: e.target.value})} 
                  className={`w-full p-4 rounded-2xl text-xs font-black outline-none border transition-all ${isDayFull ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 focus:border-blue-400'}`} 
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="bg-white p-7 rounded-[35px] shadow-sm border border-slate-200 space-y-5">
              <h3 className="font-black text-xs text-slate-800 flex items-center gap-2 italic"> <MapPin size={18} className="text-blue-600" /> موقع التنفيذ </h3>
              <button onClick={handleGetLocation} className="w-full py-5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 font-black text-[11px] flex items-center justify-center gap-2 active:scale-95 transition-all">
                {locating ? <Loader2 className="animate-spin" size={16} /> : <MapPin size={16} />}
                تحديد الموقع الحالي (GPS)
              </button>
              <textarea value={formData.locationText} onChange={e => setFormData({...formData, locationText: e.target.value})} placeholder="وصف دقيق للعنوان..." className="w-full p-5 rounded-2xl bg-slate-50 text-xs font-bold outline-none h-40 border focus:border-blue-400" />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white p-6 rounded-t-[45px] shadow-[0_-15px_40px_rgba(0,0,0,0.08)] border-t border-slate-100 shrink-0 z-20">
        <div className="flex gap-2">
            {step > 1 && (
                <button onClick={() => setStep(step - 1)} className="px-6 bg-slate-100 text-slate-600 rounded-[25px] font-black text-xs">السابق</button>
            )}
            <button
              onClick={() => {
                if (step === 1) {
                    if (!formData.fullName || !formData.startDate || !formData.phone) return showToast("⚠️ أكمل البيانات", "info");
                    setStep(2);
                } else {
                    // --- التعديل هنا لمنع الإرسال بدون إحداثيات ---
                    if (!formData.locationCoords) {
                      return showToast("⚠️ يرجى الضغط على زر تحديد الموقع (GPS) أولاً لضمان دقة الخدمة", "error");
                    }
                    handleSubmit();
                }
              }}
              disabled={isSubmitting}
              className={`flex-1 py-5 rounded-[30px] font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2 ${
                isSubmitting ? 'bg-slate-100 text-slate-300' : 'bg-[#1E293B] text-white active:scale-95'
              }`}
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : step === 2 ? "تأكيد الحجز النهائي 🚀" : "استمرار ➡️"}
            </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center font-black text-xs text-gray-900 italic animate-pulse">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
