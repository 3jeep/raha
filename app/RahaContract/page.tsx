"use client";
import React, { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { 
  User, Calendar, Loader2, Clock, MapPin, ShieldCheck, Star, FileText, Gavel, HeartHandshake, Percent
} from "lucide-react";
import { showToast, runSafe, isValidSudanesePhone, getFCMToken } from "@/lib/utils";
import { sendSmartNotification } from "@/utils/notif-logic";

export default function RahaContract() {
  const router = useRouter();
  
  // --- States ---
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [contractId, setContractId] = useState("");
  const [locating, setLocating] = useState(false); 
  const [isFirstOrder, setIsFirstOrder] = useState(false);
  const [basePrice, setBasePrice] = useState(0);
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  
  const [startDate, setStartDate] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  
  const [profile, setProfile] = useState({ 
    fullName: "", 
    phone: "", 
    address: "",
    region: "" 
  });
  const [userId, setUserId] = useState("");

  const getDayName = (dateStr: string) => {
    const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    return days[new Date(dateStr).getDay()];
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (getDayName(dateValue) === "الجمعة") {
      showToast("⚠️ عذراً، لا يمكن بدء التعاقد يوم الجمعة. يرجى اختيار يوم آخر.", "error");
      setStartDate("");
      setSelectedDays([]);
    } else {
      setStartDate(dateValue);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      showToast("⚠️ متصفحك لا يدعم تحديد الموقع", "error");
      return;
    }
    
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setProfile(prev => ({ 
          ...prev, 
          address: `📍 الموقع الجغرافي: ${latitude}, ${longitude}`
        }));
        showToast("📍 تم تحديد موقعك بنجاح", "success");
        setLocating(false);
      },
      (error) => {
        console.error(error);
        showToast("❌ خطأ في تحديد الموقع، يرجى تفعيله من الإعدادات", "error");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    setContractId(`RAHA-${Math.floor(10000 + Math.random() * 90000)}`);
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/login"); return; }
      setUserId(user.uid);
      try {
        // جلب السعر
        const priceSnap = await getDoc(doc(db, "settings", "cleaning_prices"));
        if (priceSnap.exists()) {
          setBasePrice(priceSnap.data().multi_price || 0);
        }

        // جلب المناطق
        const regionSnap = await getDoc(doc(db, "settings", "region"));
        if (regionSnap.exists()) {
          setAvailableRegions(regionSnap.data().array || []);
        }

        const q = query(collection(db, "contracts"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        setIsFirstOrder(querySnapshot.empty);

        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({ 
            fullName: data.fullName || "", 
            phone: data.phone || "", 
            address: data.address || "",
            region: data.region || "" 
          });
        }
        handleGetLocation();
      } catch (err) { console.error(err); } finally { setLoading(false); }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (startDate) {
      const dayName = getDayName(startDate);
      setSelectedDays([dayName]); 
    }
  }, [startDate]);

  const handleNextToDays = () => {
    if (!profile.fullName || !profile.address || !profile.phone || !profile.region) {
      showToast("⚠️ يرجى إكمال جميع البيانات بما في ذلك المنطقة", "info");
      return;
    }
    if (!isValidSudanesePhone(profile.phone)) {
      showToast("⚠️ رقم الهاتف غير صحيح", "error");
      return;
    }
    setStep(2);
  };

  const handleNextToContract = () => {
    if (!startDate) {
      showToast("⚠️ يرجى تحديد تاريخ بداية العقد", "info");
      return;
    }
    if (selectedDays.length < 2) {
      showToast("⚠️ يرجى اختيار يومين إضافيين لتفعيل الاشتراك", "info");
      return;
    }
    setStep(3);
  };

  const finalizeBooking = async () => {
    if (!hasAccepted) return showToast("⚠️ يرجى الموافقة على شروط العقد", "info");

    await runSafe(setIsSubmitting, async () => {
      let token = await getFCMToken().catch(() => null);
      
      await addDoc(collection(db, "contracts"), {
        ...profile,
        userId,
        fcmToken: token, 
        startDate,
        selectedDays: selectedDays, 
        contractId,
        totalHours: 5,
        type: "monthly_contract",
        status: "pending",
        price: isFirstOrder ? basePrice * 0.9 : basePrice,
        discountApplied: isFirstOrder,
        createdAt: serverTimestamp(),
      });

      await sendSmartNotification('admin', 'new-order-admin', { customerName: profile.fullName, orderId: contractId, userId });
      if (token) await sendSmartNotification('user', 'pending', { customerName: profile.fullName, orderId: contractId, userId, token });

      showToast("🚀 تم توثيق العقد بنجاح!");
      router.replace("/my-chekout");
    });
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-blue-600"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-right" dir="rtl">
      <div className="bg-[#1E293B] text-white p-6 rounded-b-[40px] shadow-lg">
        <h1 className="text-xl font-black italic">نظام تعاقد "راحة" ✨</h1>
        <p className="text-[10px] text-slate-400 mt-1 font-bold">مرحباً، {profile.fullName}</p>
        <div className="flex gap-2 mt-3">
          {[1, 2, 3].map((s) => <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? 'bg-blue-500' : 'bg-slate-700'}`} />)}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {step === 1 && (
          <div className="bg-white p-6 rounded-[35px] shadow-sm border space-y-4">
            <h3 className="font-black text-sm text-slate-800 italic flex items-center gap-2"><User size={18}/> بيانات التعاقد</h3>
            <input value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} placeholder="رقم الهاتف" className="w-full p-4 rounded-2xl bg-slate-50 text-xs font-black outline-none" dir="ltr" />
            
            <select value={profile.region} onChange={e => setProfile({...profile, region: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 text-xs font-black outline-none border">
              <option value="">اختر المنطقة</option>
              {availableRegions.map(reg => <option key={reg} value={reg}>{reg}</option>)}
            </select>
            
            <div className="w-full py-4 rounded-2xl bg-slate-50 text-slate-600 font-black text-[10px] flex items-center justify-center gap-2 border">
              {locating ? <Loader2 className="animate-spin" size={16}/> : <MapPin size={16}/>} 
              {locating ? "جاري تحديد موقعك الدقيق..." : "تم تحديد الموقع بنجاح"}
            </div>
            <textarea value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} placeholder="وصف العنوان" className="w-full p-4 rounded-2xl bg-slate-50 text-xs font-bold h-24 border" />
          </div>
        )}

        {step === 2 && (
          <div className="bg-white p-7 rounded-[35px] shadow-sm border space-y-4">
            <h3 className="font-black text-sm text-slate-800 italic flex items-center gap-2"><Calendar size={18}/> تاريخ البداية</h3>
            <input type="date" value={startDate} className="w-full p-4 rounded-2xl bg-slate-50 font-black border" onChange={handleDateChange} min={new Date().toISOString().split("T")[0]} />
            <h3 className="font-black text-sm text-slate-800 pt-4 italic">اختر أياماً إضافية:</h3>
            <div className="grid grid-cols-3 gap-3">
              {["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"].map(day => {
                const isSelected = selectedDays.includes(day);
                const isFixed = startDate && getDayName(startDate) === day;
                return (
                  <button key={day} disabled={isFixed} onClick={() => { if(isSelected) { if(!isFixed) setSelectedDays(selectedDays.filter(d => d !== day)); } else if(selectedDays.length < 3) setSelectedDays([...selectedDays, day]); }} className={`py-6 rounded-2xl font-black transition-all border-2 ${isFixed ? 'bg-emerald-600 text-white' : isSelected ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'}`}> {day} </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white p-6 rounded-[35px] shadow-sm border space-y-6">
             <h2 className="font-black text-lg flex items-center gap-2">تفاصيل العقد {contractId}</h2>
             
             {isFirstOrder && (
               <div className="bg-green-50 p-4 rounded-2xl border border-green-200 flex items-center gap-3">
                 <Percent className="text-green-600" size={24}/>
                 <div>
                    <p className="text-green-800 font-black text-xs">خصم ترحيبي 10% ✨</p>
                    <p className="text-green-600 font-bold text-[10px]">مبارك! حصلت على خصم خاص على هذا العقد.</p>
                 </div>
               </div>
             )}

             <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-[11px] font-bold text-slate-700">
                <p>المنطقة: {profile.region}</p>
                <p>تاريخ البدء: {startDate}</p>
                <p>الأيام: {selectedDays.join("، ")}</p>
                <div className="pt-2 border-t mt-2 flex justify-between items-center">
                   <span>إجمالي السعر:</span>
                   <div className="flex gap-2 items-center">
                     {isFirstOrder && <span className="line-through text-slate-400">{basePrice} ج.س</span>}
                     <span className="text-blue-600 font-black text-sm">{isFirstOrder ? basePrice * 0.9 : basePrice} ج.س</span>
                   </div>
                </div>
             </div>
             
             <div className="space-y-4 text-[11px] text-slate-600">
                <div className="flex gap-2"><Clock size={16} className="text-blue-500"/> <p><b>نظام الساعات:</b> مدة الزيارة الساعات الظاهرة اعلي العقد .</p></div>
             
               <div className="flex gap-2"><ShieldCheck size={16} className="text-blue-500"/> <p><b>الغسيل:</b> كل  الاعمال للنظافة المنزلية او الطبيخ متاح عدا الغسيل بالايدي دون توفر غسالة وذالك لسلامة العاملة .</p></di
                <div className="flex gap-2"><ShieldCheck size={16} className="text-blue-500"/> <p><b>الإشراف:</b> تسليم واستلام الخدمة بواسطة مشرف ميداني.</p></div>
                <div className="flex gap-2"><Star size={16} className="text-amber-500"/> <p><b>العاملات:</b> عاملات خبيرات ومدربات في الضيافة والنظافة.</p></div>
                <div className="flex gap-2"><FileText size={16} className="text-teal-500"/> <p><b>مرونة الجدول:</b> يسمح بتغيير يوم واحد لمرة واحدة فقط خلال فترة العقد.</p></div>
                <div className="flex gap-2"><Gavel size={16} className="text-red-500"/> <p><b>القانون:</b> نقدم الدعم القانوني لضمان حقوق العميل والعاملة.</p></div>
                <div className="flex gap-2"><HeartHandshake size={16} className="text-green-500"/> <p><b>كرامة العاملة:</b> توفير بيئة عمل آمنة، وفي حال وجود ملاحظات يتم التواصل لاستبدال العاملة.</p></div>
             </div>

             <label className="flex items-start gap-3 cursor-pointer bg-blue-50 p-3 rounded-xl">
                <input type="checkbox" checked={hasAccepted} onChange={() => setHasAccepted(!hasAccepted)} className="w-5 h-5 rounded-lg accent-blue-600 shrink-0" />
                <span className="text-[11px] font-black text-slate-700">أوافق على أن نظام التايمر وإشراف المشرف هما المرجع في تنفيذ هذا العقد.</span>
            </label>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-t-[45px] shadow-lg border-t flex gap-2">
        {step > 1 && <button onClick={() => setStep(step - 1)} className="px-6 bg-slate-100 rounded-[25px] font-black text-xs">السابق</button>}
        <button onClick={() => { if(step === 1) handleNextToDays(); else if(step === 2) handleNextToContract(); else finalizeBooking(); }} 
                disabled={isSubmitting} className="flex-1 py-5 bg-[#1E293B] text-white rounded-[30px] font-black text-sm">
          {isSubmitting ? <Loader2 className="animate-spin mx-auto"/> : step === 3 ? "توقيع العقد والدفع 🚀" : "استمرار ➡️"}
        </button>
      </div>
    </div>
  );
}
