"use client";
import React, { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { 
  User, Calendar, ShieldCheck, UserCheck, 
  AlertTriangle, CreditCard, Scale, CheckCircle2, Loader2, Clock, ScrollText, MapPin 
} from "lucide-react";
import { showToast, runSafe, isValidSudanesePhone } from "@/lib/utils";

export default function RahaContract() {
  const router = useRouter();
  
  // --- States ---
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [contractId, setContractId] = useState("");
  const [locating, setLocating] = useState(false); 
  
  const [profile, setProfile] = useState({ 
    fullName: "", 
    phone: "", 
    gender: "", 
    address: "" 
  });
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [userId, setUserId] = useState(""); // حالة لحفظ الـ UID

  // --- Functions ---
  
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      showToast("⚠️ متصفحك لا يدعم تحديد الموقع", "error");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const locationLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setProfile(prev => ({ 
          ...prev, 
          address: `${prev.address}\n📍 الموقع الجغرافي: ${locationLink}` 
        }));
        showToast("📍 تم تحديد موقعك بنجاح", "success");
        setLocating(false);
      },
      (error) => {
        showToast("❌ فشل تحديد الموقع، يرجى المحاولة يدوياً", "error");
        setLocating(false);
      }
    );
  };

  // --- Effects ---
  useEffect(() => {
    setContractId(`RAHA-${Math.floor(10000 + Math.random() * 90000)}`);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      
      setUserId(user.uid); // حفظ الـ UID فور التأكد من تسجيل الدخول

      try {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            fullName: data.fullName || "",
            phone: data.phone || "",
            gender: data.gender || "",
            address: data.address || ""
          });
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // --- Logic ---
  const handleNextToDays = () => {
    if (!profile.fullName || !profile.gender || !profile.address || !profile.phone) {
      showToast("⚠️ يرجى إكمال بياناتك أولاً", "info");
      return;
    }
    if (!isValidSudanesePhone(profile.phone)) {
      showToast("⚠️ رقم الهاتف غير صحيح", "error");
      return;
    }
    setStep(2);
  };

  const handleNextToContract = () => {
    if (selectedDays.length < 3) {
      showToast("⚠️ يرجى اختيار 3 أيام لتفعيل الاشتراك", "info");
      return;
    }
    setStep(3);
  };

  const finalizeBooking = async () => {
    await runSafe(setIsSubmitting, async () => {
      await addDoc(collection(db, "contracts"), { // تم التعديل إلى contracts للتنظيم أو ابقها bookings حسب رغبتك
        ...profile,
        userId: userId, // تم إضافة الـ UID هنا
        selectedDays,
        contractId,
        totalHours: 5,
        type: "monthly_contract",
        status: "pending",
        createdAt: serverTimestamp(),
      });
      showToast("🚀 تم توثيق العقد بنجاح!");
      router.replace("/my-chekout");
    });
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white gap-4 font-black text-blue-600">
        <Loader2 className="animate-spin" size={40} />
        <p className="italic">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-right" dir="rtl">
      
      <div className="bg-[#1E293B] text-white p-6 rounded-b-[40px] shadow-lg shrink-0 z-10">
        <h1 className="text-xl font-black italic">نظام تعاقد "راحة" ✨</h1>
        <div className="flex gap-2 mt-3">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-blue-500' : 'bg-slate-700'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-6 rounded-[35px] border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-black text-sm flex items-center gap-2 text-slate-800 italic"> <User size={18} className="text-blue-600"/> بيانات التعاقد الرسمية</h3>
              <input value={profile.fullName} onChange={e => setProfile({...profile, fullName: e.target.value})} placeholder="الاسم الكامل" className="w-full p-4 rounded-2xl bg-slate-50 text-xs font-black outline-none border focus:border-blue-400" />
              <input value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} placeholder="رقم الهاتف" className="w-full p-4 rounded-2xl bg-slate-50 text-xs font-black outline-none text-left" dir="ltr" />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setProfile({...profile, gender: "female"})} className={`py-4 rounded-2xl text-[15px] font-black border transition-all ${profile.gender === 'female' ? 'bg-pink-50 text-pink-600 border-pink-100' : 'bg-slate-50 text-slate-400 border-transparent'}`}>👩 أنثى</button>
                <button onClick={() => setProfile({...profile, gender: "male"})} className={`py-4 rounded-2xl text-[15px] font-black border transition-all ${profile.gender === 'male' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400 border-transparent'}`}>👨 ذكر</button>
              </div>
              
              <button 
                onClick={handleGetLocation}
                disabled={locating}
                className="w-full py-4 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                {locating ? <Loader2 className="animate-spin" size={16} /> : <MapPin size={16} />}
                {locating ? "جاري تحديد موقعك..." : "تحديد الموقع تلقائياً (GPS)"}
              </button>

              <textarea value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} placeholder="وصف دقيق للموقع..." className="w-full p-4 rounded-2xl bg-slate-50 text-xs font-bold outline-none h-28 resize-none" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="bg-white p-7 rounded-[35px] shadow-sm border border-slate-200">
              <h3 className="font-black text-sm text-slate-800 mb-5 flex items-center gap-2 italic"> <Calendar size={18} className="text-blue-600" /> اختر 3 أيام في الأسبوع </h3>
              <div className="grid grid-cols-3 gap-3">
                {["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"].map(day => (
                  <button key={day} onClick={() => setSelectedDays(selectedDays.includes(day) ? selectedDays.filter(d=>d!==day) : selectedDays.length < 3 ? [...selectedDays, day] : selectedDays)} className={`py-6 rounded-2xl text-[18px] font-black transition-all border-2 ${selectedDays.includes(day) ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105' : 'bg-slate-50 text-slate-400'}`}> {day} </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-in zoom-in-95 duration-500 pb-10">
             <div className="bg-white rounded-[35px] shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-[18px] font-black text-slate-400 uppercase tracking-tighter">CONTRACT NO: {contractId}</span>
                        <span className="text-[14px] font-black text-emerald-600">بانتظار التأكيد الرقمي</span>
                    </div>
                    <ScrollText size={20} className="text-slate-300" />
                </div>
                
                <div className="p-6 space-y-8">
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                        <h4 className="text-[17px] font-black text-blue-900 mb-1 flex items-center gap-1">📜 تمهيد:</h4>
                        <p className="text-[18px] text-blue-800/80 font-bold leading-relaxed italic">هذا العقد هو عهد "راحة" بيننا وبينك، صُمم ليضمن لك أعلى مستويات النظافة، وللعاملة أعلى مستويات الأمان، وللمنصة دقة التنفيذ.</p>
                    </div>

                    <section className="space-y-2 pr-3 border-r-2 border-blue-500">
                        <h4 className="text-[17px] font-black text-slate-800 flex items-center gap-2 italic">
                            <Clock size={16} className="text-blue-500" /> ١. نظام الإشراف والتسليم (الضمان الرقمي)
                        </h4>
                        <div className="text-[15px] text-slate-500 font-bold space-y-2 leading-relaxed italic">
                            <p>• <span className="text-slate-800">المشرف هو المسؤول:</span> لا تأتي العاملة وحدها؛ يرافقها مشرف مختص هو المسؤول عن ترحيلها وتسليمها لك واستلامها عند الانتهاء.</p>
                            <p>• <span className="text-slate-800">تايمر راحة:</span> يبدأ حساب الوقت "رسمياً" فقط عندما يضغط المشرف على (بدء العمل)، وينتهي بضغط (إنهاء العمل).</p>
                        </div>
                    </section>

                    <section className="space-y-2 pr-3 border-r-2 border-red-500">
                        <h4 className="text-[17px] font-black text-red-600 flex items-center gap-2 italic">
                            <ShieldCheck size={16} /> ٢. الخصوصية والأمان (خط أحمر)
                        </h4>
                        <div className="bg-red-50 p-4 rounded-2xl space-y-3 mt-1">
                            <p className="text-[15px] text-red-900 font-black italic leading-relaxed">• <span className="underline">بند العوائل:</span> يُمنع منعاً باتاً تواجد العاملة في المنزل في حال تواجد (رجال) فقط بمفردهم دون وجود "سيدة المنزل".</p>
                        </div>
                    </section>

                    <section className="space-y-2 pr-3 border-r-2 border-amber-500">
                        <h4 className="text-[17px] font-black text-slate-800 flex items-center gap-2 italic">
                            <CreditCard size={16} className="text-amber-500" /> ٣. الحقوق المالية والتعويضات
                        </h4>
                        <div className="text-[15px] text-slate-500 font-bold space-y-2 leading-relaxed italic">
                            <p>• <span className="text-slate-800">الدفع المسبق:</span> يتم تفعيل العقد والتايمر فقط بعد سداد القيمة عبر (المحفظة أو بنكك).</p>
                        </div>
                    </section>

                    <section className="space-y-2 pr-3 border-r-2 border-indigo-500">
                        <h4 className="text-[17px] font-black text-slate-800 flex items-center gap-2 italic">
                            <Calendar size={16} className="text-indigo-500" /> ٤. قواعد الجدول والترحيل
                        </h4>
                        <div className="text-[17px] text-slate-500 font-bold space-y-2 leading-relaxed italic">
                            <p>• <span className="text-slate-800">الالتزام:</span> الخدمة مرتبطة حصراً بالأيام المختارة في العقد.</p>
                        </div>
                    </section>

                    <div className="bg-[#1E293B] p-5 rounded-[25px] text-white flex justify-between items-center shadow-xl">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black opacity-60">إجمالي قيمة العقد (12 زيارة)</span>
                            <span className="text-lg font-black italic text-blue-400">180,000 ج.س</span>
                        </div>
                        <CheckCircle2 size={24} className="text-emerald-500" />
                    </div>
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-t-[45px] shadow-[0_-15px_40px_rgba(0,0,0,0.08)] border-t border-slate-100 shrink-0 z-20">
        {step === 3 && (
            <div className="space-y-4 mb-5">
                <label className="flex items-start gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={hasAccepted} 
                      onChange={() => setHasAccepted(!hasAccepted)} 
                      className="w-6 h-6 rounded-lg accent-blue-600 shrink-0 mt-0.5 shadow-sm" 
                    />
                    <span className="text-[15px] font-black text-slate-500 leading-tight italic uppercase pr-1 group-active:text-blue-600 transition-colors">
                        ✅ إقرار العميل: "بالضغط على زر التأكيد، أوافق على أن نظام (التايمر الرقمي) وإشراف (المشرف الميداني) هما المرجع في تنفيذ هذا العقد، وألتزم ببنود الخصوصية والأمانة المذكورة أعلاه."
                    </span>
                </label>
            </div>
        )}

        <div className="flex gap-2">
            {step > 1 && (
                <button 
                  onClick={() => setStep(step - 1)} 
                  className="px-6 bg-slate-100 text-slate-600 rounded-[25px] font-black text-xs active:bg-slate-200 transition-colors"
                >
                    السابق
                </button>
            )}
            <button
              onClick={() => {
                if (step === 1) handleNextToDays();
                else if (step === 2) handleNextToContract();
                else if (step === 3) finalizeBooking();
              }}
              disabled={isSubmitting || (step === 3 && !hasAccepted)}
              className={`flex-1 py-5 rounded-[30px] font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2 ${
                (step === 3 && !hasAccepted) ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-[#1E293B] text-white active:scale-95 shadow-blue-200 ring-4 ring-blue-500/10'
              }`}
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : step === 3 ? "توقيع العقد والدفع 🚀" : "استمرار ➡️"}
            </button>
        </div>
      </div>
    </div>
  );
}
