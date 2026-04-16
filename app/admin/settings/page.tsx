"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { showToast, runSafe, isValidSudanesePhone } from "@/lib/utils";

export default function AdminSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [fullDays, setFullDays] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [washPrice, setWashPrice] = useState("");
  const [ironPrice, setIronPrice] = useState("");
  const [ironOnlyPrice, setIronOnlyPrice] = useState(""); 
  const [singlePrice, setSinglePrice] = useState("");
  const [multiPrice, setMultiPrice] = useState("");

  useEffect(() => {
    const unsubSet = onSnapshot(doc(db, "settings", "contact"), (doc) => { if (doc.exists()) setWhatsappNumber(doc.data().whatsapp || ""); });
    const unsubPrices = onSnapshot(doc(db, "settings", "laundry_prices"), (doc) => {
      if (doc.exists()) {
        setWashPrice(doc.data().wash || "");
        setIronPrice(doc.data().iron || "");
        setIronOnlyPrice(doc.data().ironOnly || ""); 
      }
    });
    const unsubCleaningPrices = onSnapshot(doc(db, "settings", "cleaning_prices"), (doc) => {
      if (doc.exists()) {
        setSinglePrice(doc.data().single_price || "");
        setMultiPrice(doc.data().multi_price || "");
      }
    });
    const unsubFullDays = onSnapshot(doc(db, "settings", "availability"), (doc) => { if (doc.exists()) setFullDays(doc.data().fullDays || []); });
    
    return () => { unsubSet(); unsubPrices(); unsubCleaningPrices(); unsubFullDays(); };
  }, []);

  const saveSettings = async () => {
    if (whatsappNumber && !isValidSudanesePhone(whatsappNumber)) return;
    await runSafe(setLoading, async () => {
      await setDoc(doc(db, "settings", "contact"), { whatsapp: whatsappNumber }, { merge: true });
      await setDoc(doc(db, "settings", "laundry_prices"), { wash: washPrice, iron: ironPrice, ironOnly: ironOnlyPrice }, { merge: true });
      await setDoc(doc(db, "settings", "cleaning_prices"), { single_price: singlePrice, multi_price: multiPrice }, { merge: true });
      showToast("تم حفظ الإعدادات بنجاح ✅");
    });
  };

  const addFullDay = async () => {
    if (!selectedDate) return showToast("اختر التاريخ", "info");
    await runSafe(setLoading, async () => {
      await setDoc(doc(db, "settings", "availability"), { fullDays: arrayUnion(selectedDate) }, { merge: true });
      setSelectedDate("");
    });
  };

  const removeFullDay = async (date: string) => {
    await runSafe(setLoading, async () => {
      await setDoc(doc(db, "settings", "availability"), { fullDays: arrayRemove(date) }, { merge: true });
    });
  };

  return (
    <div className={`min-h-screen bg-white pb-20 text-right font-sans ${loading ? 'opacity-50' : ''}`} dir="rtl">
      {/* هيدر بسيط وناعم */}
      <div className="border-b border-gray-100 p-8 flex justify-between items-center px-10">
        <h1 className="text-2xl font-black text-gray-900">إعدادات النظام</h1>
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-900 text-2xl transition-all">✕</button>
      </div>

      <div className="max-w-3xl mx-auto mt-10 px-6 space-y-16">
        
        {/* قسم النظافة - مساحات مفتوحة */}
        <section className="space-y-6">
          <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest border-r-4 border-blue-600 pr-3">خدمات النظافة</h2>
          <div className="grid grid-cols-2 gap-8">
            <div className="group">
              <label className="block text-[11px] font-black text-gray-400 mb-2 mr-1">سعر الزيارة المفردة</label>
              <input type="number" value={singlePrice} onChange={e => setSinglePrice(e.target.value)} className="w-full bg-gray-50 p-5 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all font-bold" />
            </div>
            <div className="group">
              <label className="block text-[11px] font-black text-gray-400 mb-2 mr-1">سعر الزيارة المتعددة</label>
              <input type="number" value={multiPrice} onChange={e => setMultiPrice(e.target.value)} className="w-full bg-gray-50 p-5 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all font-bold" />
            </div>
          </div>
        </section>

        {/* قسم الغسيل */}
        <section className="space-y-6">
          <h2 className="text-sm font-black text-indigo-600 uppercase tracking-widest border-r-4 border-indigo-600 pr-3">خدمات الغسيل</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 mb-2">غسيل</label>
              <input type="number" value={washPrice} onChange={e => setWashPrice(e.target.value)} className="w-full bg-gray-50 p-4 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 mb-2">غسيل و كوي</label>
              <input type="number" value={ironPrice} onChange={e => setIronPrice(e.target.value)} className="w-full bg-gray-50 p-4 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 mb-2">كوي</label>
              <input type="number" value={ironOnlyPrice} onChange={e => setIronOnlyPrice(e.target.value)} className="w-full bg-gray-50 p-4 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
            </div>
          </div>
        </section>

        {/* التواصل */}
        <section className="space-y-4">
          <label className="block text-sm font-black text-gray-700">واتساب الدعم (سيظهر للعملاء)</label>
          <input type="text" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="مثال: 2499..." className="w-full bg-white p-5 rounded-2xl border-2 border-gray-100 focus:border-green-500 outline-none font-bold text-lg" />
          <button onClick={saveSettings} className="w-full bg-gray-900 text-white py-5 rounded-2xl font-bold hover:bg-black transition-all shadow-xl">حفظ التغييرات</button>
        </section>

        <hr className="border-gray-50" />

        {/* إدارة المواعيد - تصميم مسطح */}
        <section className="space-y-6">
          <h2 className="text-sm font-black text-red-600 uppercase tracking-widest border-r-4 border-red-600 pr-3">تواريخ الحجز المغلقة</h2>
          <div className="flex gap-4">
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="flex-1 bg-gray-50 p-5 rounded-2xl outline-none border-2 border-transparent focus:border-red-500 font-bold" />
            <button onClick={addFullDay} className="bg-red-50 text-red-600 px-8 rounded-2xl font-black text-sm hover:bg-red-600 hover:text-white transition-all">إغلاق التاريخ</button>
          </div>
          <div className="flex flex-wrap gap-3">
            {fullDays.map(date => (
              <div key={date} className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
                <span className="text-xs font-bold text-gray-600">{date}</span>
                <button onClick={() => removeFullDay(date)} className="text-red-400 hover:text-red-600 font-bold">×</button>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
