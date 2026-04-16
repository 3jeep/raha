"use client";
import React, { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, onSnapshot, collection, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { 
  User, MapPin, Loader2, ClipboardCheck, 
  Truck, PhoneCall, Info, CheckCircle2 
} from "lucide-react";
// استيراد الدوال المختصرة من ملفك
import { showToast, runSafe, getCurrentGPSLocation, isValidSudanesePhone, formatSDG } from "@/lib/utils";

export default function LaundryCheckout() {
  const router = useRouter();
  
  // --- States ---
  const [step, setStep] = useState(1); 
  const [prices, setPrices] = useState({ wash: 0, iron: 0, ironOnly: 0 });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [userId, setUserId] = useState<string | null>(null);

  // بيانات المستخدم والطلب
  const [fullName, setFullName] = useState(""); 
  const [contactPhone, setContactPhone] = useState(""); 
  const [addressDescription, setAddressDescription] = useState(""); 
  const [locationCoords, setLocationCoords] = useState<any>(null); 
  const [locationStatus, setLocationStatus] = useState("جاري تحديد موقعك...");
  const [pieces, setPieces] = useState(12); 
  const [serviceType, setServiceType] = useState("wash_only");

  // --- Effects ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        const userDoc = await getDoc(doc(db, "users", user.uid));
        let profileData: any = {};
        if (userDoc.exists()) {
          profileData = userDoc.data();
          setFullName(profileData.fullName || "");
          setContactPhone(profileData.phone || "");
          setAddressDescription(profileData.address || "");
        }

        getCurrentGPSLocation()
          .then((coords) => {
            setLocationCoords(coords);
            setLocationStatus("تم تحديد موقعك الحالي ✅");
          })
          .catch(() => {
            if (profileData.latitude && profileData.longitude) {
              setLocationCoords({ lat: profileData.latitude, lng: profileData.longitude });
              setLocationStatus("تم استخدام موقعك المسجل 🏠");
            } else {
              setLocationStatus("يرجى تشغيل الـ GPS أو وصف العنوان ⚠️");
            }
          });
      } else {
        router.push("/login");
      }
    });

    const unsubSettings = onSnapshot(doc(db, "settings", "laundry_prices"), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setPrices({ 
          wash: Number(data.wash) || 0, 
          iron: Number(data.iron) || 0,
          ironOnly: Number(data.ironOnly) || 0 
        });
      }
      setLoading(false);
    });

    return () => { unsubscribeAuth(); unsubSettings(); };
  }, [router]);

  // --- Logic ---
  const totalPrice = pieces * (
    serviceType === "wash_iron" ? prices.iron : 
    serviceType === "iron_only" ? prices.ironOnly : prices.wash
  );

  const handleNextToMechanism = () => {
    if (!fullName || !contactPhone || !addressDescription) {
      showToast("⚠️ يرجى إكمال بيانات التواصل والعنوان", "info");
      return;
    }
    if (!isValidSudanesePhone(contactPhone)) return;
    if (pieces < 12) {
      showToast("عذراً، أقل عدد للطلب هو 12 قطعة", "info");
      return;
    }
    setStep(2);
  };

  const handleSubmitOrder = async () => {
    await runSafe(setIsSubmitting, async () => {
      await addDoc(collection(db, "laundry_orders"), {
        orderNumber: Math.floor(1000 + Math.random() * 9000),
        userId,
        userName: fullName,
        pieces,
        serviceType,
        totalPrice,
        contactPhone,
        addressDescription,
        location: locationCoords,
        status: "pending",
        isRated: false,
        createdAt: serverTimestamp(),
      });
      showToast("🚀 تم إرسال طلب الغسيل بنجاح!");
      router.push("/my-checkout");
    });
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white gap-4 font-black text-blue-600">
        <Loader2 className="animate-spin" size={40} />
        <p className="italic">جاري تجهيز المغسلة...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-right" dir="rtl">
      
      {/* Header & Progress */}
      <div className="bg-[#1E293B] text-white p-6 rounded-b-[40px] shadow-lg shrink-0 z-10">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-black italic">طلب غسيل ملابس 🧺</h1>
          <button onClick={() => router.push("/")} className="text-[10px] bg-white/10 px-3 py-1 rounded-full italic">الرئيسية 🏠</button>
        </div>
        <div className="flex gap-2 mt-3">
          {[1, 2].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-blue-500' : 'bg-slate-700'}`} />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* نوع الخدمة */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "wash_only", label: "غسيل فقط", p: prices.wash },
                { id: "iron_only", label: "مكواة فقط", p: prices.ironOnly },
                { id: "wash_iron", label: "غسيل ومكواة", p: prices.iron },
              ].map((item) => (
                <button 
                  key={item.id}
                  onClick={() => setServiceType(item.id)}
                  className={`p-3 rounded-[25px] border-2 transition-all ${serviceType === item.id ? "border-blue-600 bg-blue-50 shadow-md" : "border-white bg-white opacity-60"}`}
                >
                  <p className="text-[8px] font-black mb-1">{item.label}</p>
                  <p className="text-[11px] font-black text-blue-900">{item.p} <span className="text-[7px]">ج.س</span></p>
                </button>
              ))}
            </div>

            {/* عدد القطع */}
            <div className="bg-[#1E293B] text-white p-6 rounded-[35px] flex justify-between items-center shadow-xl border-b-4 border-blue-600">
              <div className="flex flex-col">
                 <span className="font-black text-[12px] italic">عدد القطع</span>
                 <span className="text-[8px] text-blue-300 font-bold">الحد الأدنى 12 قطعة</span>
              </div>
              <div className="flex items-center gap-5">
                <button onClick={() => setPieces(p => Math.max(12, p - 1))} className="w-10 h-10 bg-white/10 rounded-2xl font-black text-xl">-</button>
                <span className="font-black text-3xl w-8 text-center">{pieces}</span>
                <button onClick={() => setPieces(p => p + 1)} className="w-10 h-10 bg-white text-blue-900 rounded-2xl font-black text-xl shadow-lg">+</button>
              </div>
            </div>

            {/* بيانات الموقع والتواصل */}
            <div className="bg-white p-6 rounded-[35px] border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-black text-sm flex items-center gap-2 text-slate-800 italic"> <User size={18} className="text-blue-600"/> بيانات الاستلام</h3>
              <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="الاسم الكامل" className="w-full p-4 rounded-2xl bg-slate-50 text-xs font-black outline-none border focus:border-blue-400" />
              <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="رقم الهاتف" className="w-full p-4 rounded-2xl bg-slate-50 text-xs font-black outline-none text-left" dir="ltr" />
              
              <div className={`p-4 rounded-2xl border-2 border-dashed text-[9px] font-black flex items-center gap-2 ${locationCoords ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
                <MapPin size={16} /> {locationStatus}
              </div>

              <textarea value={addressDescription} onChange={e => setAddressDescription(e.target.value)} placeholder="وصف العنوان (المنطقة، الشارع، علامة مميزة...)" className="w-full p-4 rounded-2xl bg-slate-50 text-xs font-bold outline-none h-24 resize-none" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in zoom-in-95 duration-500 pb-10">
             <div className="bg-white rounded-[35px] shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-blue-600 px-5 py-4 flex justify-between items-center text-white">
                    <span className="text-[14px] font-black italic">آلية تنفيذ الطلب ⚙️</span>
                    <Truck size={20} />
                </div>
                
                <div className="p-6 space-y-6">
                    <section className="space-y-2 pr-3 border-r-2 border-blue-500">
                        <h4 className="text-[15px] font-black text-slate-800 flex items-center gap-2 italic">
                            <PhoneCall size={16} className="text-blue-500" /> ١. التأكيد الهاتفي
                        </h4>
                        <p className="text-[13px] text-slate-500 font-bold leading-relaxed italic">
                          بمجرد إرسال الطلب، سيقوم فريق "راحة" بالاتصال بك لتأكيد الموعد ونوع القطع.
                        </p>
                    </section>

                    <section className="space-y-2 pr-3 border-r-2 border-emerald-500">
                        <h4 className="text-[15px] font-black text-slate-800 flex items-center gap-2 italic">
                            <Truck size={16} className="text-emerald-500" /> ٢. وصول المندوب
                        </h4>
                        <p className="text-[13px] text-slate-500 font-bold leading-relaxed italic">
                          سيصلك ترحيل "راحة" إلى موقعك لاستلام الملابس (أقل عدد ١٢ قطعة)، وسيتم فحصها وتسليمك إيصال استلام رقمي.
                        </p>
                    </section>

                    <section className="space-y-2 pr-3 border-r-2 border-amber-500">
                        <h4 className="text-[15px] font-black text-slate-800 flex items-center gap-2 italic">
                            <ClipboardCheck size={16} className="text-amber-500" /> ٣. المعالجة والتسليم
                        </h4>
                        <p className="text-[13px] text-slate-500 font-bold leading-relaxed italic">
                          بعد الانتهاء من الغسيل/المكواة، سنقوم بإبلاغك بأن ملابسك في الطريق إليك عبر إشعار أو اتصال هاتفي.
                        </p>
                    </section>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                        <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase">
                          <span>ملخص التكلفة</span>
                          <span>{pieces} قطعة</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xl font-black text-blue-900 italic">{totalPrice.toLocaleString()} ج.س</span>
                          <span className="text-[10px] text-red-500 font-bold italic">* لا يشمل التوصيل</span>
                        </div>
                    </div>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="bg-white p-6 rounded-t-[45px] shadow-[0_-15px_40px_rgba(0,0,0,0.08)] border-t border-slate-100 shrink-0 z-20">
        <div className="flex gap-2">
            {step > 1 && (
                <button 
                  onClick={() => setStep(step - 1)} 
                  disabled={isSubmitting}
                  className="px-6 bg-slate-100 text-slate-600 rounded-[25px] font-black text-xs active:bg-slate-200 transition-colors"
                >
                    السابق
                </button>
            )}
            <button
              onClick={() => {
                if (step === 1) handleNextToMechanism();
                else if (step === 2) handleSubmitOrder();
              }}
              disabled={isSubmitting}
              className={`flex-1 py-5 rounded-[30px] font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2 bg-[#1E293B] text-white active:scale-95 shadow-blue-200 ring-4 ring-blue-500/10`}
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : step === 2 ? "تأكيد وإرسال الطلب ✅" : "استمرار ➡️"}
            </button>
        </div>
      </div>
    </div>
  );
}
