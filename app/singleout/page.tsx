"use client";

import React, { useState, useEffect, Suspense } from "react";
import { db, auth } from "@/lib/firebase";
import { 
  collection, addDoc, serverTimestamp, doc, getDoc, getDocs, query, where, onSnapshot 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { showToast, runSafe, getCurrentGPSLocation, getFCMToken } from "@/lib/utils";
import { sendSmartNotification } from "@/utils/notif-logic";

function CheckoutContent() {
  const router = useRouter();

  // --- States ---
  const [step, setStep] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  
  const [isDayFull, setIsDayFull] = useState(false);
  const [totalMaidsInSystem, setTotalMaidsInSystem] = useState(0);
  const [adminFullDays, setAdminFullDays] = useState<string[]>([]);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [regions, setRegions] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    gender: "female", 
    startDate: "",        
    locationText: "",    
    region: "",
    locationCoords: null as { lat: number, lng: number } | null,
    maidsCount: 1,
    basePrice: 0,
    totalHours: 0,
    shift: "morning",
    status: "pending"
  });

  // --- Initialization ---
  useEffect(() => {
    const fetchData = async () => {
      const settingsSnap = await getDoc(doc(db, "settings", "cleaning_prices"));
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setFormData(prev => ({ 
          ...prev, 
          basePrice: Number(data.single_price) || 0,
          totalHours: Number(data.single_hours) || 5 
        }));
      }

      const regionsSnap = await getDoc(doc(db, "settings", "region"));
      if (regionsSnap.exists()) {
        setRegions(regionsSnap.data().array || []);
      }

      const maidsSnap = await getDocs(collection(db, "maids"));
      setTotalMaidsInSystem(maidsSnap.size);
      
      onSnapshot(doc(db, "settings", "availability"), (s) => {
        if (s.exists()) setAdminFullDays(s.data().fullDays || []);
      });
    };
    fetchData();
    
    onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/login");
      } else {
        setUser(u);
        try {
          const userDoc = await getDoc(doc(db, "users", u.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setFormData(prev => ({
              ...prev,
              fullName: userData.fullName || "",
              phone: userData.phone || "",
              locationText: userData.address || "",
              region: userData.region || "" 
            }));
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
        }
      }
      setLoading(false);
    });
  }, [router]);

  // --- Logic ---
  const getOriginalPrice = () => formData.basePrice * formData.maidsCount;
  const getFinalPrice = () => {
    const original = getOriginalPrice();
    const discount = formData.maidsCount === 2 ? 0.05 : formData.maidsCount === 3 ? 0.10 : 0;
    return original * (1 - discount);
  };

  const getDayName = (dateStr: string) => {
    if (!dateStr) return "";
    const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    return days[new Date(dateStr).getDay()];
  };

  useEffect(() => {
    const checkAvailability = async () => {
      if (!formData.startDate) return;
      if (adminFullDays.includes(formData.startDate)) return setIsDayFull(true);
      
      const q = query(collection(db, "bookings"), where("startDate", "==", formData.startDate), where("status", "!=", "cancelled"));
      const snap = await getDocs(q);
      let bookedMaids = 0;
      snap.forEach(d => bookedMaids += (d.data().maidsCount || 1));
      setIsDayFull((bookedMaids + formData.maidsCount) > totalMaidsInSystem);
    };
    checkAvailability();
  }, [formData.startDate, formData.maidsCount, totalMaidsInSystem, adminFullDays]);

  const handleNextStep = () => {
    if (!formData.startDate) return showToast("⚠️ يرجى اختيار تاريخ الزيارة أولاً", "error");
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (isDayFull) return showToast("⚠️ اليوم المختار مكتمل", "error");
    if (!hasAcceptedTerms) return showToast("⚠️ يرجى الموافقة على الشروط أولاً", "error");
    if (!formData.locationCoords) return showToast("⚠️ يرجى تحديد الموقع عبر GPS", "error");
    if (!formData.region) return showToast("⚠️ يرجى اختيار المنطقة", "error");

    await runSafe(setIsSubmitting, async () => {
      const token = await getFCMToken().catch(() => null);
      
      await addDoc(collection(db, "bookings"), {
        ...formData,
        userId: user.uid,
        price: getFinalPrice(),
        packageName: `زيارة مفردة - ${formData.totalHours} ساعات (${formData.maidsCount} عاملة)`,
        serviceType: "single_visit",
        fcmToken: token,
        createdAt: serverTimestamp(),
      });

      await sendSmartNotification('admin', 'new-order-admin', { 
        customerName: formData.fullName,
        orderType: "single_visit" 
      });
      
      showToast("🚀 تم حجز موعدك بنجاح!");
      router.replace("/my-chekout");
    });
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen pb-24" dir="rtl">
      <div className="mb-6 flex gap-2">
        {[1, 2, 3].map(s => <div key={s} className={`h-2 flex-1 rounded-full ${step >= s ? 'bg-blue-600' : 'bg-slate-200'}`} />)}
      </div>

      {step === 1 && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-black mb-2">تفاصيل الخدمة</h2>
            <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl font-black text-blue-600">{getFinalPrice()} ج.س</span>
                {formData.maidsCount > 1 && <span className="text-sm font-bold text-slate-400 line-through">{getOriginalPrice()} ج.س</span>}
            </div>
            
            {/* إضافة توضيح الخصم */}
            <div className="text-xs font-bold text-emerald-600 mb-4 bg-emerald-50 p-2 rounded-lg">
                {formData.maidsCount === 2 ? "خصم 5% للعامله الثانية" : formData.maidsCount === 3 ? "خصم 10% للعامله الثالثة" : "عروض خاصة عند زيادة عدد العاملات!"}
            </div>

            <select value={formData.shift} onChange={e => setFormData({...formData, shift: e.target.value})} className="w-full p-4 border rounded-2xl font-bold bg-slate-50">
                <option value="morning">الفترة الصباحية</option>
                <option value="afternoon">الفترة المسائية</option>
            </select>

            <div className="flex items-center justify-between mt-4 p-4 border rounded-2xl bg-slate-50">
              <span className="font-bold">عدد العاملات</span>
              <div className="flex items-center gap-4">
                <button onClick={() => setFormData({...formData, maidsCount: Math.max(1, formData.maidsCount - 1)})} className="w-8 h-8 rounded-full bg-slate-200">-</button>
                <span className="font-black">{formData.maidsCount}</span>
                <button onClick={() => setFormData({...formData, maidsCount: Math.min(3, formData.maidsCount + 1)})} className="w-8 h-8 rounded-full bg-blue-600 text-white">+</button>
              </div>
            </div>

            <input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="الاسم الكامل" className="w-full mt-4 p-4 border rounded-2xl font-bold" />
            <input type="date" min={new Date().toISOString().split('T')[0]} value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className={`w-full mt-4 p-4 border rounded-2xl font-bold ${isDayFull ? 'bg-red-50 text-red-600' : ''}`} />
          </div>
        </div>
      )}

      {/* الخطوات 2 و 3 تبقى كما هي */}
      {step === 2 && (
        <div className="bg-white p-6 rounded-3xl shadow-sm animate-in fade-in space-y-4">
           <button onClick={async () => { setLocating(true); const c = await getCurrentGPSLocation(); setFormData({...formData, locationCoords: c}); setLocating(false); }} className="w-full py-6 bg-blue-50 text-blue-600 rounded-2xl font-bold flex items-center justify-center gap-2">
             {locating ? <Loader2 className="animate-spin" /> : "📍 تحديد الموقع الحالي (GPS)"}
           </button>
           
           <select 
             value={formData.region} 
             onChange={e => setFormData({...formData, region: e.target.value})} 
             className="w-full p-4 border rounded-2xl font-bold bg-slate-50"
           >
             <option value="">اختر المنطقة</option>
             {regions.map((region) => (
                <option key={region} value={region}>{region}</option>
             ))}
           </select>

           <textarea value={formData.locationText} onChange={e => setFormData({...formData, locationText: e.target.value})} placeholder="وصف إضافي للعنوان..." className="w-full p-4 border rounded-2xl h-32" />
        </div>
      )}

      {step === 3 && (
        <div className="bg-white p-6 rounded-3xl shadow-sm animate-in fade-in">
          <h2 className="font-black text-lg mb-4">تفاصيل وبنود الخدمة</h2>
          
          <div className="bg-blue-50 p-4 rounded-2xl mb-6 text-sm font-bold space-y-2">
            <p>👥 عدد العاملات: <span className="text-blue-600">{formData.maidsCount} عاملة</span></p>
            <p>⏳ عدد الساعات: <span className="text-blue-600">{formData.totalHours} ساعات</span></p>
            <p>📅 الموعد: <span className="text-blue-600">{getDayName(formData.startDate)} - {formData.startDate}</span></p>
          </div>

          <div className="text-xs text-slate-500 space-y-3 leading-loose">
            <p>1. يرجى التأكد من تواجد سيدة المنزل ويمنع تواجد العاملة بدون تواجد سيدة المنزل.</p>
            <p>2. الخدمة تشمل {formData.totalHours} ساعات عمل متواصلة؛ أي طلب تمديد يخضع لرسوم إضافية.</p>
            <p>3. في حال الإلغاء قبل الموعد بـ 3 ساعات، لا يتم استرداد رسوم الحجز.</p>
            <p>4. يمكنك من الساعة الأولى طلب وقف العاملة وسيتم تغيير العاملة في حين توفرها حسب جدول راحة.</p>
            <p>5. أدوات النظافة هدية من راحة.</p>
            <p>6. يتم غسيل الملابس عن طريق الغسالة فقط، ويمنع الغسيل اليدوي.</p>
          </div>
          
          <label className="flex items-center gap-3 mt-6 p-4 border rounded-2xl cursor-pointer">
            <input type="checkbox" className="w-5 h-5" checked={hasAcceptedTerms} onChange={e => setHasAcceptedTerms(e.target.checked)} />
            <span className="font-bold text-sm">أوافق على كافة البنود والشروط المذكورة</span>
          </label>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t rounded-t-3xl shadow-lg">
        <div className="flex gap-3">
          {step > 1 && (
            <button 
              onClick={() => setStep(step - 1)}
              className="py-4 px-8 bg-slate-100 rounded-2xl font-black text-slate-700 active:scale-95 transition-all"
            >
              رجوع
            </button>
          )}
          <button 
            onClick={() => step < 3 ? handleNextStep() : handleSubmit()} 
            disabled={isSubmitting}
            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-lg active:scale-95 transition-all"
          >
            {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : step === 3 ? "تأكيد الحجز النهائي" : "استمرار"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}><CheckoutContent /></Suspense>;
}
