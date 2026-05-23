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
      setLocating(true);
      try {
        const coords = await getCurrentGPSLocation();
        setFormData(prev => ({ ...prev, locationCoords: coords }));
      } catch (err) {
        console.error("فشل جلب الموقع التلقائي:", err);
      } finally {
        setLocating(false);
      }

      const settingsSnap = await getDoc(doc(db, "settings", "cleaning_prices")); 
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setFormData(prev => ({ 
          ...prev, 
          basePrice: Number(data.event_price) || 0,
          totalHours: Number(data.event_hours) || 5 
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
    if (formData.maidsCount === 3) {
      return original - (original * 0.10); // خصم 10%
    }
    return original;
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
    if (!formData.locationCoords) return showToast("⚠️ يرجى تفعيل الموقع (GPS)", "error");
    if (!formData.region) return showToast("⚠️ يرجى اختيار المنطقة", "error");
    if (!formData.phone) return showToast("⚠️ يرجى إدخال رقم الهاتف", "error");

    await runSafe(setIsSubmitting, async () => {
      const token = await getFCMToken().catch(() => null);
      
      await addDoc(collection(db, "bookings"), {
        ...formData,
        userId: user.uid,
        price: getFinalPrice(),
        packageName: `زيارة مناسبات - ${formData.totalHours} ساعات (${formData.maidsCount} عاملة)`,
        serviceType: "single_visit",
        fcmToken: token,
        createdAt: serverTimestamp(),
      });

      await sendSmartNotification('admin', 'new-order-admin', { 
        customerName: formData.fullName,
        orderType: "event_visit" 
      });
      
      showToast("🚀 تم حجز موعد المناسبة بنجاح!");
      router.replace("/my-chekout");
    });
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-purple-600" size={40} /></div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen pb-24" dir="rtl">
      <div className="mb-6 flex gap-2">
        {[1, 2, 3].map(s => <div key={s} className={`h-2 flex-1 rounded-full ${step >= s ? 'bg-purple-600' : 'bg-slate-200'}`} />)}
      </div>

      {step === 1 && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-400 mb-1">أهلاً {formData.fullName || "عزيزي"}</h2>
            <h2 className="text-lg font-black mb-4 text-purple-700">تفاصيل زيارة المناسبات</h2>
            
            <div className="flex flex-col mb-4">
                <span className="text-3xl font-black text-purple-600">
                    {getFinalPrice()} ج.س
                </span>
                {formData.maidsCount === 3 && (
                    <span className="text-sm font-bold text-green-600">تم تطبيق خصم 10% للمناسبات الكبيرة! 🎉</span>
                )}
            </div>

            <select value={formData.shift} onChange={e => setFormData({...formData, shift: e.target.value})} className="w-full p-4 border rounded-2xl font-bold bg-slate-50">
                <option value="morning">الفترة الصباحية</option>
                <option value="afternoon">الفترة المسائية</option>
            </select>

            <div className="flex items-center justify-between mt-4 p-4 border rounded-2xl bg-slate-50">
              <span className="font-bold">عدد العاملات (حد أقصى 3)</span>
              <div className="flex items-center gap-4">
                <button onClick={() => setFormData({...formData, maidsCount: Math.max(1, formData.maidsCount - 1)})} className="w-8 h-8 rounded-full bg-slate-200">-</button>
                <span className="font-black">{formData.maidsCount}</span>
                <button onClick={() => setFormData({...formData, maidsCount: Math.min(3, formData.maidsCount + 1)})} className="w-8 h-8 rounded-full bg-purple-600 text-white">+</button>
              </div>
            </div>

            <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="رقم الهاتف" className="w-full mt-4 p-4 border rounded-2xl font-bold" />
            <input type="date" min={new Date().toISOString().split('T')[0]} value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className={`w-full mt-4 p-4 border rounded-2xl font-bold ${isDayFull ? 'bg-red-50 text-red-600' : ''}`} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white p-6 rounded-3xl shadow-sm animate-in fade-in space-y-4">
           {locating ? (
             <div className="w-full py-6 bg-purple-50 text-purple-600 rounded-2xl font-bold flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" /> جاري تحديد موقعك الدقيق...
             </div>
           ) : (
             <div className="w-full py-4 bg-green-50 text-green-700 rounded-2xl font-bold text-center border border-green-200">
               ✅ تم تحديد الموقع بنجاح
             </div>
           )}
           
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
          <h2 className="font-black text-lg mb-4 text-purple-700">اتفاقية الخدمة وشروط التنفيذ</h2>
          
          <div className="h-72 overflow-y-auto bg-slate-50 p-4 rounded-2xl text-xs font-bold text-slate-700 space-y-4 border border-slate-100 leading-relaxed">
            <p>1. <b>نطاق التنظيف:</b> تشمل الخدمة غسيل الأواني المنزلية، الترتيب العام، وتنظيف الأرضيات والأسطح. <b>(خدمة غسيل الملابس باليد غير مشمولة وتعتبر خدمة منفصلة).</b></p>
            <p>2. <b>كفاءة العمل والوقت:</b> تلتزم العاملة بأداء مهامها بأعلى كفاءة خلال الساعات المحجوزة. إذا كان العمل كثيراً، يرجى اختيار <b>(عدد عاملات أكثر)</b> لضمان إنجاز المهام بالكامل في الوقت المحدد.</p>
            <p>3. <b>المقتنيات:</b> الشركة غير مسؤولة عن أي مقتنيات شخصية غير مؤمنة. يرجى تأمين الأشياء الثمينة قبل وصول الفريق.</p>
            <p>4. <b>سياسة الإلغاء:</b> يتم استرداد التأمين بالكامل عند الإلغاء قبل 24 ساعة. عند الإلغاء قبل أقل من 12 ساعة، لا يسترد مبلغ التأمين.</p>
            <p>5. <b>وقت العمل:</b> يبدأ احتساب الساعات من لحظة وصول الفريق للموقع. لا يتم تعويض الساعات الضائعة بسبب تأخير العميل.</p>
            <p>6. <b>الخصوصية:</b> يمنع منعاً باتاً التصوير داخل المكان حفاظاً على خصوصية الجميع.</p>
          </div>

          <label className="flex items-center gap-3 mt-6 p-4 border rounded-2xl cursor-pointer hover:bg-purple-50 transition-colors">
            <input 
              type="checkbox" 
              className="w-5 h-5 accent-purple-600" 
              checked={hasAcceptedTerms} 
              onChange={e => setHasAcceptedTerms(e.target.checked)} 
            />
            <span className="font-bold text-sm">أوافق على كافة الشروط وبنود الخدمة المذكورة أعلاه</span>
          </label>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t rounded-t-3xl shadow-lg">
        <div className="flex gap-3">
          {step > 1 && <button onClick={() => setStep(step - 1)} className="py-4 px-8 bg-slate-100 rounded-2xl font-black">رجوع</button>}
          <button onClick={() => step < 3 ? handleNextStep() : handleSubmit()} disabled={isSubmitting} className="flex-1 py-4 bg-purple-600 text-white rounded-2xl font-black">
            {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : step === 3 ? "تأكيد حجز المناسبة" : "استمرار"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EventCheckoutPage() {
  return <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}><CheckoutContent /></Suspense>;
}
