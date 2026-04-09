"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, onSnapshot, collection, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function LaundryCheckout() {
  const router = useRouter();
  
  const [prices, setPrices] = useState({ wash: 0, iron: 0, ironOnly: 0 });
  const [whatsappNumber, setWhatsappNumber] = useState(""); 
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [userId, setUserId] = useState<string | null>(null);

  const [fullName, setFullName] = useState(""); 
  const [contactPhone, setContactPhone] = useState(""); 
  const [addressDescription, setAddressDescription] = useState(""); 
  const [locationCoords, setLocationCoords] = useState<any>(null); 
  const [locationStatus, setLocationStatus] = useState("جاري تحديد موقعك...");

  const [pieces, setPieces] = useState(12); 
  const [serviceType, setServiceType] = useState("wash_only");

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

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setLocationCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              setLocationStatus("تم تحديد موقعك الحالي ✅");
            },
            () => {
              if (profileData.latitude && profileData.longitude) {
                setLocationCoords({ lat: profileData.latitude, lng: profileData.longitude });
                setLocationStatus("تم استخدام موقعك المسجل 🏠");
              } else {
                setLocationStatus("يرجى تشغيل الـ GPS أو وصف العنوان ⚠️");
              }
            },
            { enableHighAccuracy: true, timeout: 5000 }
          );
        }
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
        setWhatsappNumber(data.Contact || ""); 
      }
      setLoading(false);
    });

    return () => { unsubscribeAuth(); unsubSettings(); };
  }, [router]);

  const totalPrice = pieces * (
    serviceType === "wash_iron" ? prices.iron : 
    serviceType === "iron_only" ? prices.ironOnly : prices.wash
  );

  const handleSubmitOrder = async () => {
    if (pieces < 12) return alert("عذراً، أقل عدد للطلب هو 12 قطعة");
    if (!addressDescription.trim() || !contactPhone.trim()) return alert("يرجى إكمال بيانات التواصل");
    
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
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
      alert("🚀 تم إرسال طلبك بنجاح!");
      router.push("/");
    } catch (e) { 
      alert("❌ حدث خطأ أثناء الإرسال، يرجى المحاولة لاحقاً"); 
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white p-6 pb-56 text-right font-sans relative" dir="rtl">
      
      {/* زر الرئيسية في الأعلى */}
      <div className="flex justify-between items-center mb-4">
        <div className="h-1 w-10 bg-blue-600 rounded-full"></div>
        <button 
          onClick={() => router.push("/")}
          className="bg-blue-50 text-blue-900 px-4 py-2 rounded-full text-[10px] font-black italic shadow-sm border border-blue-100 active:scale-90 transition-transform"
        >
          الرئيسية 🏠
        </button>
      </div>

      
      <div className="mb-8">
        <h1 className="text-2xl font-black text-blue-900 italic">تأكيد الطلب 🧺</h1>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-8">
        {[
          { id: "wash_only", label: "غسيل فقط", p: prices.wash },
          { id: "iron_only", label: "مكواة فقط", p: prices.ironOnly },
          { id: "wash_iron", label: "غسيل ومكواة", p: prices.iron },
        ].map((item) => (
          <button 
            key={item.id}
            disabled={isSubmitting}
            onClick={() => setServiceType(item.id)}
            className={`p-3 rounded-[25px] border-2 transition-all duration-300 ${serviceType === item.id ? "border-blue-600 bg-blue-50 shadow-md" : "border-gray-50 text-gray-900 opacity-60"}`}
          >
            <p className="text-[8px] font-black mb-1">{item.label}</p>
            <p className="text-[11px] font-black text-blue-900">{item.p} <span className="text-[7px]">ج.س</span></p>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div className={`p-4 rounded-2xl border-2 border-dashed text-[9px] font-black flex items-center gap-2 ${locationCoords ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
          <span className="text-lg">📍</span> {locationStatus}
        </div>

        <div className="bg-[#1E293B] text-white p-6 rounded-[35px] flex justify-between items-center shadow-2xl border-b-4 border-blue-600">
          <div className="flex flex-col">
             <span className="font-black text-[12px] italic">عدد القطع</span>
             <span className="text-[8px] text-blue-300 font-bold">الحد الأدنى 12 قطعة</span>
          </div>
          <div className="flex items-center gap-5">
            <button disabled={isSubmitting} onClick={() => setPieces(p => Math.max(12, p - 1))} className="w-10 h-10 bg-white/10 rounded-2xl font-black text-xl hover:bg-white/20 transition-colors">-</button>
            <span className="font-black text-3xl w-8 text-center">{pieces}</span>
            <button disabled={isSubmitting} onClick={() => setPieces(p => p + 1)} className="w-10 h-10 bg-white text-blue-900 rounded-2xl font-black text-xl shadow-lg active:scale-90 transition-transform">+</button>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <div className="bg-gray-50 p-4 rounded-[25px] border border-gray-100">
            <label className="text-[9px] font-black text-gray-900 mr-2 block mb-1 uppercase">رقم الهاتف</label>
            <input disabled={isSubmitting} type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full bg-transparent text-sm font-black outline-none placeholder:text-gray-900" placeholder="0XXXXXXXXX" />
          </div>

          <div className="bg-gray-50 p-4 rounded-[25px] border border-gray-100">
            <label className="text-[9px] font-black text-gray-900 mr-2 block mb-1 uppercase">العنوان بالتفصيل</label>
            <textarea disabled={isSubmitting} value={addressDescription} onChange={(e) => setAddressDescription(e.target.value)} rows={2} className="w-full bg-transparent text-sm font-black outline-none resize-none placeholder:text-gray-900" placeholder="المنطقة، الشارع، علامة مميزة..." />
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t rounded-t-[45px] shadow-[0_-15px_50px_rgba(0,0,0,0.12)] z-[1000]">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-1">
             <p className="text-[9px] text-gray-900 font-black uppercase tracking-widest">المبلغ الإجمالي</p>
             <p className="text-[9px] text-red-500 font-black italic">* لا يشمل رسوم التوصيل</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-3xl font-black text-blue-900 leading-none">{totalPrice.toLocaleString()} <span className="text-xs font-bold">ج.س</span></p>
            <button 
              disabled={isSubmitting} 
              onClick={handleSubmitOrder} 
              className={`${isSubmitting ? 'bg-gray-900 cursor-not-allowed' : 'bg-blue-600 active:scale-95 shadow-xl'} text-white px-10 py-5 rounded-[25px] font-black text-xs transition-all flex items-center gap-2`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  جاري الإرسال...
                </>
              ) : (
                "إرسال الطلب ✅"
              )}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
