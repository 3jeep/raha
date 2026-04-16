"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, onSnapshot, doc, setDoc, query, orderBy, arrayUnion, arrayRemove 
} from "firebase/firestore";

import { 
  showToast, 
  handleSave, 
  handleUpdate, 
  handleDelete, 
  runSafe,
  isValidSudanesePhone,
  getCurrentGPSLocation,
  openInGoogleMaps
} from "@/lib/utils";

export default function AdminControlCenter() {
  const [activeTab, setActiveTab] = useState("staff");
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); 

  const [maids, setMaids] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [laundryOrders, setLaundryOrders] = useState<any[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  
  const [fullDays, setFullDays] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [washPrice, setWashPrice] = useState("");
  const [ironPrice, setIronPrice] = useState("");
  const [ironOnlyPrice, setIronOnlyPrice] = useState(""); 

  const initialMaidState = { name: "", nationality: "", age: "", education: "", addressText: "", idNumber: "", location: null as any };
  const [maidForm, setMaidForm] = useState(initialMaidState);

  const initialVehicleState = { driverName: "", driverPhone: "", region: "", identityNo: "", driverIdCard: "", location: null as any };
  const [vehicleForm, setVehicleForm] = useState(initialVehicleState);

  const initialPkgState = { 
    name: "", 
    price: "", 
    description: "", 
    image: "https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcQb_0Jft39cBA6OcUVP38r_Ckd9RSt8fjZV3LBorjfW9ncBBFfP", 
    category: "single", 
    hours: "5", 
    duration: "1m", 
    timePeriod: "morning", 
    showIn: "main", 
    minCompletedOrders: "0" 
  };
  const [pkgForm, setPkgForm] = useState(initialPkgState);

  useEffect(() => {
    const unsubM = onSnapshot(collection(db, "maids"), (s) => setMaids(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubV = onSnapshot(collection(db, "vehicles"), (s) => setVehicles(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubP = onSnapshot(collection(db, "packages"), (s) => setPackages(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qL = query(collection(db, "laundry_orders"), orderBy("createdAt", "desc"));
    const unsubL = onSnapshot(qL, (s) => setLaundryOrders(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubSet = onSnapshot(doc(db, "settings", "contact"), (doc) => { if (doc.exists()) setWhatsappNumber(doc.data().whatsapp || ""); });
    const unsubPrices = onSnapshot(doc(db, "settings", "laundry_prices"), (doc) => {
      if (doc.exists()) {
        setWashPrice(doc.data().wash || "");
        setIronPrice(doc.data().iron || "");
        setIronOnlyPrice(doc.data().ironOnly || ""); 
      }
    });
    const unsubFullDays = onSnapshot(doc(db, "settings", "availability"), (doc) => { if (doc.exists()) setFullDays(doc.data().fullDays || []); });
    return () => { unsubM(); unsubV(); unsubP(); unsubL(); unsubSet(); unsubPrices(); unsubFullDays(); };
  }, []);

  // --- دوال "بدء التعديل" المحسنة (Sanitized Data) ---
  
  const startEditingMaid = (m: any) => {
    setEditId(m.id);
    setMaidForm({
      name: m.name ?? "",
      nationality: m.nationality ?? "",
      age: m.age ?? "",
      education: m.education ?? "",
      addressText: m.addressText ?? "",
      idNumber: m.idNumber ?? "",
      location: m.location ?? null
    });
  };

  const startEditingVehicle = (v: any) => {
    setEditId(v.id);
    setVehicleForm({
      driverName: v.driverName ?? "",
      driverPhone: v.driverPhone ?? "",
      region: v.region ?? "",
      identityNo: v.identityNo ?? "",
      driverIdCard: v.driverIdCard ?? "",
      location: v.location ?? null
    });
  };

  const startEditingPkg = (p: any) => {
    setEditId(p.id);
    setPkgForm({
      name: p.name ?? "",
      price: p.price ?? "",
      description: p.description ?? "",
      image: p.image ?? initialPkgState.image,
      category: p.category ?? "single",
      hours: p.hours ?? "5",
      duration: p.duration ?? "1m",
      timePeriod: p.timePeriod ?? "morning",
      showIn: p.showIn ?? "main",
      minCompletedOrders: p.minCompletedOrders ?? "0"
    });
  };

  const getLocation = async (type: "maid" | "vehicle") => {
    await runSafe(setLoading, async () => {
      const loc = await getCurrentGPSLocation();
      if (type === "maid") setMaidForm(prev => ({ ...prev, location: loc }));
      else setVehicleForm(prev => ({ ...prev, location: loc }));
    });
  };

  // --- دوال الحفظ المحسنة لضمان عدم وجود قيم undefined ---

  const handleSaveMaid = async () => {
    if(!maidForm.name) return showToast("الاسم مطلوب", "error");
    
    // تنظيف البيانات لضمان عدم إرسال أي قيمة undefined لـ Firebase
    const cleanMaidData = {
      name: maidForm.name || "",
      nationality: maidForm.nationality || "",
      age: maidForm.age || "",
      education: maidForm.education || "",
      addressText: maidForm.addressText || "",
      idNumber: maidForm.idNumber || "",
      location: maidForm.location || null
    };

    await runSafe(setLoading, async () => {
      if (editId) await handleUpdate("maids", editId, cleanMaidData);
      else await handleSave("maids", cleanMaidData);
      setEditId(null); setMaidForm(initialMaidState);
    });
  };

  const handleSaveVehicle = async () => {
    if(!vehicleForm.driverName) return showToast("اسم السائق مطلوب", "error");
    if (vehicleForm.driverPhone && !isValidSudanesePhone(vehicleForm.driverPhone)) return;

    // تنظيف البيانات
    const cleanVehicleData = {
      driverName: vehicleForm.driverName || "",
      driverPhone: vehicleForm.driverPhone || "",
      region: vehicleForm.region || "",
      identityNo: vehicleForm.identityNo || "",
      driverIdCard: vehicleForm.driverIdCard || "",
      location: vehicleForm.location || null
    };

    await runSafe(setLoading, async () => {
      if (editId) await handleUpdate("vehicles", editId, cleanVehicleData);
      else await handleSave("vehicles", cleanVehicleData);
      setEditId(null); setVehicleForm(initialVehicleState);
    });
  };

  const handleSavePackage = async () => {
    if(!pkgForm.name || !pkgForm.price) return showToast("أكمل بيانات العرض", "error");
    await runSafe(setLoading, async () => {
      if (editId) await handleUpdate("packages", editId, pkgForm);
      else await handleSave("packages", pkgForm);
      setEditId(null); setPkgForm(initialPkgState);
    });
  };

  const saveSettings = async () => {
    if (whatsappNumber && !isValidSudanesePhone(whatsappNumber)) return;
    await runSafe(setLoading, async () => {
      await setDoc(doc(db, "settings", "contact"), { whatsapp: whatsappNumber }, { merge: true });
      await setDoc(doc(db, "settings", "laundry_prices"), { wash: washPrice, iron: ironPrice, ironOnly: ironOnlyPrice }, { merge: true });
      showToast("تم حفظ جميع الإعدادات والأسعار");
    });
  };

  const addFullDay = async () => {
    if (!selectedDate) return showToast("اختر التاريخ أولاً", "info");
    if (fullDays.includes(selectedDate)) return showToast("هذا التاريخ مضاف مسبقاً", "info");
    await runSafe(setLoading, async () => {
      await setDoc(doc(db, "settings", "availability"), { fullDays: arrayUnion(selectedDate) }, { merge: true });
      setSelectedDate("");
      showToast("تم إغلاق الحجز لهذا اليوم");
    });
  };

  const removeFullDay = async (date: string) => {
    await runSafe(setLoading, async () => {
      await setDoc(doc(db, "settings", "availability"), { fullDays: arrayRemove(date) }, { merge: true });
      showToast("تم إعادة فتح اليوم للحجز");
    });
  };

  return (
    <div className={`min-h-screen bg-[#F8FAFC] pb-24 text-right font-sans transition-opacity ${loading ? 'opacity-60 pointer-events-none' : ''}`} dir="rtl">
      
      {/* Header */}
      <div className="bg-[#1E293B] text-white p-10 rounded-b-[50px] shadow-2xl mb-8 text-center">
        <h1 className="text-2xl font-black italic">لوحة التحكم الذكية</h1>
        <p className="text-[10px] opacity-40 font-bold uppercase tracking-[2px] mt-1">Smart Resource Management</p>
      </div>

      {/* Tabs Navigation */}
      <div className="px-4 flex gap-2 mb-8 overflow-x-auto no-scrollbar pb-2">
        {[
          {id:"staff", label:"العاملات", icon:"👩‍💼"},
          {id:"logistics", label:"السائقين", icon:"🚚"},
          {id:"packages", label:"العروض", icon:"📦"},
          {id:"laundry", label:"الغسيل", icon:"🧺"}
        ].map(t => (
          <button 
            key={t.id} 
            onClick={() => { setActiveTab(t.id); setEditId(null); }} 
            className={`min-w-[95px] p-5 rounded-[30px] font-black text-[9px] border-2 transition-all flex flex-col items-center gap-1 shrink-0 ${activeTab === t.id ? 'bg-[#2B4C7E] text-white border-[#2B4C7E] shadow-xl scale-105' : 'bg-white text-gray-400 border-gray-50'}`}
          >
            <span className="text-2xl">{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div className="px-5">
        {/* Staff Tab */}
        {activeTab === "staff" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white p-7 rounded-[40px] shadow-sm space-y-3 border-t-4 border-blue-500">
              <h3 className="font-black text-gray-700 text-[11px] mb-2">{editId ? "📝 تعديل عاملة" : "➕ تسجيل عاملة"}</h3>
              <input value={maidForm.name ?? ""} onChange={e => setMaidForm({...maidForm, name: e.target.value})} placeholder="الاسم" className="w-full p-4 rounded-2xl bg-gray-50 text-xs font-bold outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <input value={maidForm.nationality ?? ""} onChange={e => setMaidForm({...maidForm, nationality: e.target.value})} placeholder="الجنسية" className="p-4 rounded-2xl bg-gray-50 text-xs font-bold outline-none" />
                <input value={maidForm.idNumber ?? ""} onChange={e => setMaidForm({...maidForm, idNumber: e.target.value})} placeholder="رقم الهوية" className="p-4 rounded-2xl bg-blue-50/50 text-xs font-bold outline-none border border-blue-100" />
              </div>
              <input value={maidForm.addressText ?? ""} onChange={e => setMaidForm({...maidForm, addressText: e.target.value})} placeholder="العنوان" className="w-full p-4 rounded-2xl bg-gray-50 text-xs font-bold outline-none" />
              <button onClick={() => getLocation("maid")} className={`w-full py-3 rounded-2xl text-[10px] font-black border-2 border-dashed transition-all ${maidForm.location ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                {maidForm.location ? "📍 تم حفظ موقع العاملة" : "📍 تحديد موقع GPS للعاملة"}
              </button>
              <button disabled={loading} onClick={handleSaveMaid} className={`w-full py-4 rounded-2xl font-black text-xs shadow-lg ${editId ? 'bg-green-600' : 'bg-[#2B4C7E]'} text-white active:scale-95`}>
                {loading ? "جاري الحفظ..." : editId ? "تحديث البيانات ✅" : "حفظ العاملة ✅"}
              </button>
            </div>
            {maids.map(m => (
              <div key={m.id} className="bg-white p-5 rounded-[30px] flex justify-between items-center shadow-sm border border-gray-50">
                <div><p className="font-black text-xs text-gray-800">{m.name}</p><p className="text-[9px] text-blue-500 font-bold mt-1">🏠 {m.addressText}</p></div>
                <div className="flex gap-3">
                  <button onClick={() => openInGoogleMaps(m.location)} className="text-gray-300 transition-transform active:scale-125">📍</button>
                  <button onClick={() => startEditingMaid(m)} className="text-blue-300">📝</button>
                  <button onClick={() => handleDelete("maids", m.id)} className="text-red-100 text-xl">×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Logistics Tab */}
        {activeTab === "logistics" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white p-7 rounded-[40px] shadow-sm space-y-3 border-t-4 border-orange-500">
              <h3 className="font-black text-gray-700 text-[11px] mb-2">{editId ? "📝 تعديل بيانات السائق" : "➕ تسجيل سائق جديد"}</h3>
              <input value={vehicleForm.driverName ?? ""} onChange={e => setVehicleForm({...vehicleForm, driverName: e.target.value})} placeholder="اسم السائق" className="w-full p-4 rounded-2xl bg-gray-50 text-xs font-bold outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <input value={vehicleForm.driverPhone ?? ""} onChange={e => setVehicleForm({...vehicleForm, driverPhone: e.target.value})} placeholder="رقم الهاتف" className="p-4 rounded-2xl bg-gray-50 text-xs font-bold outline-none" />
                <input value={vehicleForm.identityNo ?? ""} onChange={e => setVehicleForm({...vehicleForm, identityNo: e.target.value})} placeholder="رقم العربة" className="p-4 rounded-2xl bg-gray-50 text-xs font-bold outline-none" />
              </div>
              <input value={vehicleForm.region ?? ""} onChange={e => setVehicleForm({...vehicleForm, region: e.target.value})} placeholder="المنطقة" className="w-full p-4 rounded-2xl bg-gray-50 text-xs font-bold outline-none" />
              <button onClick={() => getLocation("vehicle")} className={`w-full py-3 rounded-2xl text-[10px] font-black border-2 border-dashed transition-all ${vehicleForm.location ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                {vehicleForm.location ? "📍 تم حفظ موقع السائق" : "📍 تحديد موقع GPS للسائق"}
              </button>
              <button disabled={loading} onClick={handleSaveVehicle} className={`w-full py-4 rounded-2xl font-black text-xs text-white shadow-lg ${editId ? 'bg-green-600' : 'bg-orange-600'} active:scale-95`}>
                {loading ? "جاري الحفظ..." : editId ? "تحديث بيانات السائق ✅" : "حفظ السائق الجديد ✅"}
              </button>
            </div>
            {vehicles.map(v => (
              <div key={v.id} className="bg-white p-5 rounded-[30px] border-r-8 border-orange-500 shadow-sm flex justify-between items-center">
                <div><p className="font-black text-xs text-gray-800">{v.driverName}</p><p className="text-[9px] text-orange-600 font-bold italic">🚚 {v.identityNo} | 📞 {v.driverPhone}</p></div>
                <div className="flex gap-3">
                  <button onClick={() => openInGoogleMaps(v.location)} className="text-gray-300">📍</button>
                  <button onClick={() => startEditingVehicle(v)} className="text-orange-300">📝</button>
                  <button onClick={() => handleDelete("vehicles", v.id)} className="text-red-100">×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Packages Tab */}
        {activeTab === "packages" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white p-7 rounded-[40px] shadow-sm space-y-4 border-t-4 border-purple-600">
              <h3 className="font-black text-gray-700 text-[11px] mb-1">⚙️ إعداد العرض الذكي</h3>
              <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl mb-2">
                {[{id: "main", label: "أساسي", color: "bg-blue-600"}, {id: "special", label: "خاص", color: "bg-amber-500"}, {id: "hidden", label: "مخفي", color: "bg-gray-400"}].map(place => (
                  <button key={place.id} onClick={() => setPkgForm({...pkgForm, showIn: place.id})} className={`flex-1 py-3 rounded-xl text-[8px] font-black transition-all ${pkgForm.showIn === place.id ? `${place.color} text-white shadow-md scale-105` : 'bg-white text-gray-300'}`}>{place.label}</button>
                ))}
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-2">
                <label className="text-[9px] font-black text-amber-700 block italic">🏆 يفتح بعد عدد زيارات (مكتملة):</label>
                <input type="number" value={pkgForm.minCompletedOrders ?? "0"} onChange={e => setPkgForm({...pkgForm, minCompletedOrders: e.target.value})} className="w-full p-3 rounded-xl bg-white text-xs font-black outline-none border border-amber-200 text-center" />
              </div>
              <input value={pkgForm.name ?? ""} onChange={e => setPkgForm({...pkgForm, name: e.target.value})} placeholder="اسم الباقة" className="w-full p-4 rounded-2xl bg-gray-50 text-xs font-bold outline-none" />
              <textarea value={pkgForm.description ?? ""} onChange={e => setPkgForm({...pkgForm, description: e.target.value})} placeholder="تفاصيل ومميزات العرض..." rows={3} className="w-full p-4 rounded-2xl bg-gray-50 text-xs font-bold outline-none resize-none" />
              <div className="grid grid-cols-2 gap-2">
                <input value={pkgForm.price ?? ""} onChange={e => setPkgForm({...pkgForm, price: e.target.value})} placeholder="السعر" type="number" className="p-4 rounded-2xl bg-gray-50 text-xs font-bold outline-none" />
                <input value={pkgForm.image ?? ""} onChange={e => setPkgForm({...pkgForm, image: e.target.value})} placeholder="رابط الصورة" className="p-4 rounded-2xl bg-purple-50 text-[9px] font-bold outline-none border border-purple-100" />
              </div>
              <button disabled={loading} onClick={handleSavePackage} className="w-full py-4 rounded-2xl font-black text-xs text-white bg-purple-600 shadow-lg active:scale-95">
                {loading ? "جاري الحفظ..." : editId ? "حفظ التعديلات ✅" : "إضافة الباقة للنظام ✅"}
              </button>
            </div>
            {packages.map(p => (
              <div key={p.id} className="bg-white p-5 rounded-[35px] flex justify-between items-center shadow-sm border border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 overflow-hidden border border-gray-50"><img src={p.image} className="w-full h-full object-cover" alt="Pkg" /></div>
                  <div>
                    <p className="font-black text-xs text-gray-700">{p.name}</p>
                    <p className="text-[10px] text-purple-600 font-bold mt-1 italic">{p.price} ج.س</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEditingPkg(p)} className="p-2 text-blue-300">📝</button>
                  <button onClick={() => handleDelete("packages", p.id)} className="text-red-100 text-xl">×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Laundry Tab */}
        {activeTab === "laundry" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            {laundryOrders.map(order => (
              <div key={order.id} className={`bg-white p-6 rounded-[35px] border-r-[10px] shadow-sm ${order.status === 'completed' ? 'border-green-500' : 'border-blue-500'}`}>
                <div className="flex justify-between items-start mb-4">
                   <div>
                      <span className="text-[8px] font-black text-gray-300 block">رقم الطلب: {order.orderNumber}</span>
                      <h4 className="font-black text-gray-800 text-xs">{order.userName || "عميل راحة"}</h4>
                   </div>
                   <button disabled={loading} onClick={() => runSafe(setLoading, () => handleUpdate("laundry_orders", order.id, { status: order.status === 'completed' ? 'pending' : 'completed' }))} className={`px-3 py-1.5 rounded-xl text-[8px] font-black ${order.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                      {order.status === 'completed' ? 'مكتمل ✅' : 'قيد الانتظار ⏳'}
                   </button>
                </div>
                <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                   <div className="flex gap-2">
                      <button onClick={() => openInGoogleMaps(order.location)} className="p-2 px-4 bg-blue-600 text-white rounded-xl text-[9px] font-black shadow-md">📍 الموقع</button>
                      <button onClick={() => handleDelete("laundry_orders", order.id)} className="p-2 px-4 bg-red-50 text-red-500 rounded-xl text-[9px] font-black">حذف</button>
                   </div>
                   <p className="text-sm font-black text-[#1E293B]">{order.totalPrice} <span className="text-[10px]">ج.س</span></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
