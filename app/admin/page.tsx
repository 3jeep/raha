"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, setDoc, query, orderBy, arrayUnion, arrayRemove 
} from "firebase/firestore";

export default function AdminControlCenter() {
  const [activeTab, setActiveTab] = useState("staff");
  const [editId, setEditId] = useState<string | null>(null);

  // --- القوائم (Lists) ---
  const [maids, setMaids] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [laundryOrders, setLaundryOrders] = useState<any[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  
  // --- أيام الحجز المكتملة ---
  const [fullDays, setFullDays] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");

  // --- أسعار الغسيل ---
  const [washPrice, setWashPrice] = useState("");
  const [ironPrice, setIronPrice] = useState("");
  const [ironOnlyPrice, setIronOnlyPrice] = useState(""); 

  // --- نماذج البيانات (Forms) ---
  const initialMaidState = { 
    name: "", nationality: "", age: "", education: "", addressText: "", idNumber: "", location: null as any 
  };
  const [maidForm, setMaidForm] = useState(initialMaidState);

  const initialVehicleState = { 
    driverName: "", driverPhone: "", region: "", identityNo: "", driverIdCard: "", location: null as any 
  };
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

  // --- جلب البيانات من Firebase ---
  useEffect(() => {
    const unsubM = onSnapshot(collection(db, "maids"), (s) => setMaids(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubV = onSnapshot(collection(db, "vehicles"), (s) => setVehicles(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubP = onSnapshot(collection(db, "packages"), (s) => setPackages(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const qL = query(collection(db, "laundry_orders"), orderBy("createdAt", "desc"));
    const unsubL = onSnapshot(qL, (s) => setLaundryOrders(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubSet = onSnapshot(doc(db, "settings", "contact"), (doc) => {
      if (doc.exists()) setWhatsappNumber(doc.data().whatsapp || "");
    });

    const unsubPrices = onSnapshot(doc(db, "settings", "laundry_prices"), (doc) => {
      if (doc.exists()) {
        setWashPrice(doc.data().wash || "");
        setIronPrice(doc.data().iron || "");
        setIronOnlyPrice(doc.data().ironOnly || ""); 
      }
    });

    // جلب الأيام المكتملة
    const unsubFullDays = onSnapshot(doc(db, "settings", "availability"), (doc) => {
      if (doc.exists()) setFullDays(doc.data().fullDays || []);
    });

    return () => { unsubM(); unsubV(); unsubP(); unsubL(); unsubSet(); unsubPrices(); unsubFullDays(); };
  }, []);

  // --- العمليات (Actions) ---
  const deleteItem = async (col: string, id: string) => { 
    if (confirm("هل أنت متأكد؟ لا يمكن التراجع عن الحذف.")) await deleteDoc(doc(db, col, id)); 
  };

  const updateOrderStatus = async (id: string, newStatus: string) => {
    await updateDoc(doc(db, "laundry_orders", id), { status: newStatus });
  };

  const saveSettings = async () => {
    try {
      await setDoc(doc(db, "settings", "contact"), { whatsapp: whatsappNumber }, { merge: true });
      await setDoc(doc(db, "settings", "laundry_prices"), { 
        wash: washPrice, 
        iron: ironPrice,
        ironOnly: ironOnlyPrice 
      }, { merge: true });
      alert("✅ تم حفظ جميع الإعدادات والأسعار");
    } catch (e) {
      alert("❌ حدث خطأ أثناء الحفظ");
    }
  };

  // دوال إدارة الأيام المكتملة
  const addFullDay = async () => {
    if (!selectedDate) return alert("اختر التاريخ أولاً");
    if (fullDays.includes(selectedDate)) return alert("هذا التاريخ مضاف مسبقاً");
    await setDoc(doc(db, "settings", "availability"), {
      fullDays: arrayUnion(selectedDate)
    }, { merge: true });
    setSelectedDate("");
  };

  const removeFullDay = async (date: string) => {
    await setDoc(doc(db, "settings", "availability"), {
      fullDays: arrayRemove(date)
    }, { merge: true });
  };

  const openInMaps = (loc: any) => {
    if (loc && loc.lat) window.open(`https://www.google.com/maps?q=${loc.lat},${loc.lng}`, "_blank");
    else alert("الموقع الجغرافي غير متوفر");
  };

  const getLocation = (type: "maid" | "vehicle") => {
    if (!navigator.geolocation) return alert("المتصفح لا يدعم GPS");
    navigator.geolocation.getCurrentPosition((position) => {
      const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
      if (type === "maid") setMaidForm({ ...maidForm, location: loc });
      else setVehicleForm({ ...vehicleForm, location: loc });
      alert("✅ تم التقاط الموقع الجغرافي بنجاح!");
    }, () => alert("❌ فشل تحديد الموقع، تأكد من تفعيل الـ GPS"));
  };

  const handleSaveMaid = async () => {
    if(!maidForm.name) return alert("الاسم مطلوب");
    if (editId) {
        await updateDoc(doc(db, "maids", editId), maidForm);
        alert("✅ تم تعديل بيانات العاملة بنجاح");
    } else {
        await addDoc(collection(db, "maids"), maidForm);
        alert("✅ تم حفظ بيانات العاملة الجديدة بنجاح");
    }
    setEditId(null); setMaidForm(initialMaidState);
  };

  const handleSaveVehicle = async () => {
    if(!vehicleForm.driverName) return alert("اسم السائق مطلوب");
    if (editId) {
        await updateDoc(doc(db, "vehicles", editId), vehicleForm);
        alert("✅ تم تعديل بيانات السائق بنجاح");
    } else {
        await addDoc(collection(db, "vehicles"), vehicleForm);
        alert("✅ تم حفظ بيانات السائق الجديد بنجاح");
    }
    setEditId(null); setVehicleForm(initialVehicleState);
  };

  const handleSavePackage = async () => {
    if(!pkgForm.name || !pkgForm.price) return alert("أكمل بيانات العرض");
    if (editId) {
        await updateDoc(doc(db, "packages", editId), pkgForm);
        alert("✅ تم تعديل العرض بنجاح");
    } else {
        await addDoc(collection(db, "packages"), pkgForm);
        alert("✅ تم إضافة العرض الجديد بنجاح");
    }
    setEditId(null); setPkgForm(initialPkgState);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-right font-sans" dir="rtl">
      
      <div className="bg-[#1E293B] text-white p-10 rounded-b-[50px] shadow-2xl mb-8 text-center">
        <h1 className="text-2xl font-black italic">لوحة التحكم الذكية</h1>
        <p className="text-[10px] opacity-40 font-bold uppercase tracking-[2px] mt-1">Smart Resource Management</p>
      </div>

      <div className="px-4 flex gap-2 mb-8 overflow-x-auto no-scrollbar pb-2">
        {[
          {id:"staff", label:"العاملات", icon:"👩‍💼"},
          {id:"logistics", label:"السائقين", icon:"🚚"},
          {id:"packages", label:"العروض", icon:"📦"},
          {id:"settings", label:"الإعدادات", icon:"⚙️"},
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

        {activeTab === "staff" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white p-7 rounded-[40px] shadow-sm space-y-3 border-t-4 border-blue-500">
              <h3 className="font-black text-gray-700 text-[11px] mb-2">{editId ? "📝 تعديل عاملة" : "➕ تسجيل عاملة"}</h3>
              <input value={maidForm.name || ""} onChange={e => setMaidForm({...maidForm, name: e.target.value})} placeholder="الاسم" className="w-full p-4 rounded-2xl bg-gray-50 text-xs font-bold outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <input value={maidForm.nationality || ""} onChange={e => setMaidForm({...maidForm, nationality: e.target.value})} placeholder="الجنسية" className="p-4 rounded-2xl bg-gray-50 text-xs font-bold outline-none" />
                <input value={maidForm.idNumber || ""} onChange={e => setMaidForm({...maidForm, idNumber: e.target.value})} placeholder="رقم الهوية" className="p-4 rounded-2xl bg-blue-50/50 text-xs font-bold outline-none border border-blue-100" />
              </div>
              <input value={maidForm.addressText || ""} onChange={e => setMaidForm({...maidForm, addressText: e.target.value})} placeholder="العنوان" className="w-full p-4 rounded-2xl bg-gray-50 text-xs font-bold outline-none" />
              <button onClick={() => getLocation("maid")} className={`w-full py-3 rounded-2xl text-[10px] font-black border-2 border-dashed transition-all ${maidForm.location ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                {maidForm.location ? "📍 تم حفظ موقع العاملة" : "📍 تحديد موقع GPS للعاملة"}
              </button>
              <button onClick={handleSaveMaid} className={`w-full py-4 rounded-2xl font-black text-xs shadow-lg ${editId ? 'bg-green-600' : 'bg-[#2B4C7E]'} text-white`}>
                {editId ? "تحديث البيانات ✅" : "حفظ العاملة ✅"}
              </button>
            </div>
            {maids.map(m => (
              <div key={m.id} className="bg-white p-5 rounded-[30px] flex justify-between items-center shadow-sm border border-gray-50">
                <div><p className="font-black text-xs text-gray-800">{m.name}</p><p className="text-[9px] text-blue-500 font-bold mt-1">🏠 {m.addressText}</p></div>
                <div className="flex gap-3">
                  <button onClick={() => openInMaps(m.location)} className="text-gray-300">📍</button>
                  <button onClick={() => { setEditId(m.id); setMaidForm({...initialMaidState, ...m}); }} className="text-blue-300">📝</button>
                  <button onClick={() => deleteItem("maids", m.id)} className="text-red-100 text-xl">×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "logistics" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white p-7 rounded-[40px] shadow-sm space-y-3 border-t-4 border-orange-500">
              <h3 className="font-black text-gray-700 text-[11px] mb-2">{editId ? "📝 تعديل بيانات السائق" : "➕ تسجيل سائق جديد"}</h3>
              <input value={vehicleForm.driverName || ""} onChange={e => setVehicleForm({...vehicleForm, driverName: e.target.value})} placeholder="اسم السائق" className="w-full p-4 rounded-2xl bg-gray-50 text-xs font-bold outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <input value={vehicleForm.driverPhone || ""} onChange={e => setVehicleForm({...vehicleForm, driverPhone: e.target.value})} placeholder="رقم الهاتف" className="p-4 rounded-2xl bg-gray-50 text-xs font-bold outline-none" />
                <input value={vehicleForm.identityNo || ""} onChange={e => setVehicleForm({...vehicleForm, identityNo: e.target.value})} placeholder="رقم العربة" className="p-4 rounded-2xl bg-gray-50 text-xs font-bold outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={vehicleForm.driverIdCard || ""} onChange={e => setVehicleForm({...vehicleForm, driverIdCard: e.target.value})} placeholder="هوية السائق" className="p-4 rounded-2xl bg-orange-50/50 text-xs font-bold outline-none border border-orange-100" />
                <input value={vehicleForm.region || ""} onChange={e => setVehicleForm({...vehicleForm, region: e.target.value})} placeholder="المنطقة" className="p-4 rounded-2xl bg-gray-50 text-xs font-bold outline-none" />
              </div>
              <button onClick={() => getLocation("vehicle")} className={`w-full py-3 rounded-2xl text-[10px] font-black border-2 border-dashed transition-all ${vehicleForm.location ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                {vehicleForm.location ? "📍 تم حفظ موقع السائق" : "📍 تحديد موقع GPS للسائق"}
              </button>
              <button onClick={handleSaveVehicle} className={`w-full py-4 rounded-2xl font-black text-xs text-white shadow-lg ${editId ? 'bg-green-600' : 'bg-orange-600'}`}>
                {editId ? "تحديث بيانات السائق ✅" : "حفظ السائق الجديد ✅"}
              </button>
            </div>
            {vehicles.map(v => (
              <div key={v.id} className="bg-white p-5 rounded-[30px] border-r-8 border-orange-500 shadow-sm flex justify-between items-center">
                <div><p className="font-black text-xs text-gray-800">{v.driverName}</p><p className="text-[9px] text-orange-600 font-bold italic">🚚 {v.identityNo} | 📞 {v.driverPhone}</p></div>
                <div className="flex gap-3">
                  <button onClick={() => openInMaps(v.location)} className="text-gray-300">📍</button>
                  <button onClick={() => { setEditId(v.id); setVehicleForm({...initialVehicleState, ...v}); }} className="text-orange-300">📝</button>
                  <button onClick={() => deleteItem("vehicles", v.id)} className="text-red-100">×</button>
                </div>
              </div>
            ))}
          </div>
        )}

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
                <input type="number" value={pkgForm.minCompletedOrders || "0"} onChange={e => setPkgForm({...pkgForm, minCompletedOrders: e.target.value})} className="w-full p-3 rounded-xl bg-white text-xs font-black outline-none border border-amber-200 text-center" />
              </div>
              <input value={pkgForm.name || ""} onChange={e => setPkgForm({...pkgForm, name: e.target.value})} placeholder="اسم الباقة" className="w-full p-4 rounded-2xl bg-gray-50 text-xs font-bold outline-none" />
              <textarea value={pkgForm.description || ""} onChange={e => setPkgForm({...pkgForm, description: e.target.value})} placeholder="تفاصيل ومميزات العرض..." rows={3} className="w-full p-4 rounded-2xl bg-gray-50 text-xs font-bold outline-none resize-none" />
              <div className="grid grid-cols-2 gap-2">
                <input value={pkgForm.price || ""} onChange={e => setPkgForm({...pkgForm, price: e.target.value})} placeholder="السعر" type="number" className="p-4 rounded-2xl bg-gray-50 text-xs font-bold outline-none" />
                <input value={pkgForm.image || ""} onChange={e => setPkgForm({...pkgForm, image: e.target.value})} placeholder="رابط الصورة" className="p-4 rounded-2xl bg-purple-50 text-[9px] font-bold outline-none border border-purple-100" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[ {id: "single", label: "ساعة", icon: "🕒"}, {id: "monthly", label: "شهور", icon: "📅"}, {id: "range", label: "فترة", icon: "↔️"} ].map(type => (
                  <button key={type.id} onClick={() => setPkgForm({...pkgForm, category: type.id})} className={`p-3 rounded-2xl text-[9px] font-black border-2 transition-all flex flex-col items-center gap-1 ${pkgForm.category === type.id ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-white text-gray-400 border-gray-50'}`}><span>{type.icon}</span> {type.label}</button>
                ))}
              </div>
              <div className="p-5 rounded-3xl bg-purple-50/50 border border-purple-100 space-y-4">
                {pkgForm.category === "single" && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-purple-800 tracking-tighter">ساعات الدوام:</span>
                    <input type="number" value={pkgForm.hours || ""} onChange={e => setPkgForm({...pkgForm, hours: e.target.value})} className="w-20 p-2 rounded-xl bg-white text-center font-black text-xs outline-none shadow-sm" />
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-purple-100">
                    <span className="text-[10px] font-black text-purple-800 tracking-tighter">توقيت الخدمة:</span>
                    <select value={pkgForm.timePeriod || "morning"} onChange={e => setPkgForm({...pkgForm, timePeriod: e.target.value})} className="w-28 p-2 rounded-xl bg-white font-black text-[10px] outline-none">
                      <option value="morning">صباحي</option><option value="evening">مسائي</option>
                    </select>
                </div>
              </div>
              <button onClick={handleSavePackage} className="w-full py-4 rounded-2xl font-black text-xs text-white bg-purple-600 shadow-lg">{editId ? "حفظ التعديلات ✅" : "إضافة الباقة للنظام ✅"}</button>
            </div>
            {packages.map(p => (
              <div key={p.id} className="bg-white p-5 rounded-[35px] flex justify-between items-center shadow-sm border border-gray-50 transition-all hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 overflow-hidden border border-gray-50"><img src={p.image} className="w-full h-full object-cover" alt="Pkg" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                       <span className="p-1 px-1.5 bg-blue-50 text-[7px] font-black rounded text-blue-600 uppercase italic">{p.minCompletedOrders > 0 ? `🏆 ${p.minCompletedOrders} زيارات` : "متاح للكل"}</span>
                       <p className="font-black text-xs text-gray-700">{p.name}</p>
                    </div>
                    <p className="text-[10px] text-purple-600 font-bold mt-1 italic">{p.price} ج.س</p>
                  </div>
                </div>
                <div className="flex gap-2"><button onClick={() => { setEditId(p.id); setPkgForm({...p}); }} className="p-2 text-blue-300">📝</button><button onClick={() => deleteItem("packages", p.id)} className="text-red-100 text-xl">×</button></div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white p-8 rounded-[40px] shadow-sm border-t-4 border-green-500 space-y-8">
              <h3 className="font-black text-gray-800 text-sm">الإعدادات والأسعار</h3>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase">رقم واتساب الدعم</label>
                <input type="text" value={whatsappNumber || ""} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="249..." className="w-full p-4 rounded-2xl bg-gray-50 text-xs font-bold outline-none border border-transparent focus:border-green-200" />
              </div>
              <div className="p-6 bg-green-50/50 rounded-[30px] border border-green-100 space-y-4">
                <p className="text-[10px] font-black text-green-800 border-b border-green-100 pb-2">تسعيرة خدمة الغسيل دليفري (للقطعة):</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2"><label className="text-[9px] font-bold text-gray-500">سعر الغسيل فقط</label><input type="number" value={washPrice} onChange={(e) => setWashPrice(e.target.value)} className="w-full p-3 rounded-xl bg-white font-black text-xs text-center shadow-sm" placeholder="ج.س" /></div>
                    <div className="space-y-2"><label className="text-[9px] font-bold text-gray-500">سعر مكواة فقط</label><input type="number" value={ironOnlyPrice} onChange={(e) => setIronOnlyPrice(e.target.value)} className="w-full p-3 rounded-xl bg-white font-black text-xs text-center shadow-sm" placeholder="ج.س" /></div>
                    <div className="space-y-2"><label className="text-[9px] font-bold text-gray-500">سعر غسيل + مكواة</label><input type="number" value={ironPrice} onChange={(e) => setIronPrice(e.target.value)} className="w-full p-3 rounded-xl bg-white font-black text-xs text-center shadow-sm" placeholder="ج.س" /></div>
                </div>
              </div>
              <button onClick={saveSettings} className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-xs shadow-lg active:scale-95 transition-all">حفظ كافة التغييرات ✅</button>
            </div>

            {/* قسم إدارة التواريخ المكتملة */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm border-t-4 border-red-500 space-y-6">
              <h3 className="font-black text-gray-800 text-sm italic">📅 إدارة الأيام المكتملة (إغلاق الحجز)</h3>
              <div className="flex gap-2">
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)} 
                  className="flex-1 p-4 rounded-2xl bg-gray-50 text-xs font-black outline-none border border-gray-100" 
                />
                <button 
                  onClick={addFullDay} 
                  className="bg-red-600 text-white px-6 rounded-2xl font-black text-[10px] shadow-md active:scale-95"
                >
                  إضافة اليوم ⛔
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {fullDays.length > 0 ? fullDays.map(date => (
                  <div key={date} className="flex justify-between items-center bg-red-50 p-4 rounded-2xl border border-red-100">
                    <span className="text-[11px] font-black text-red-700">{date}</span>
                    <button onClick={() => removeFullDay(date)} className="text-red-400 font-black text-xs bg-white px-3 py-1 rounded-xl shadow-sm">حذف</button>
                  </div>
                )) : (
                  <p className="text-center py-4 text-[10px] text-gray-400 font-bold italic">لا توجد أيام مغلقة حالياً</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "laundry" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center px-2 mb-2">
              <h3 className="font-black text-gray-800 text-[11px] italic">📦 طلبات الغسيل دليفري</h3>
              <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{laundryOrders.length} طلب</span>
            </div>
            {laundryOrders.map(order => (
              <div key={order.id} className={`bg-white p-6 rounded-[35px] border-r-[10px] shadow-sm ${order.status === 'completed' ? 'border-green-500' : 'border-blue-500'}`}>
                <div className="flex justify-between items-start mb-4">
                   <div>
                      <span className="text-[8px] font-black text-gray-300 block uppercase">رقم الطلب: {order.orderNumber}</span>
                      <h4 className="font-black text-gray-800 text-xs">{order.userName || "عميل راحة"}</h4>
                   </div>
                   <button onClick={() => updateOrderStatus(order.id, order.status === 'completed' ? 'pending' : 'completed')} className={`px-3 py-1.5 rounded-xl text-[8px] font-black ${order.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                      {order.status === 'completed' ? 'مكتمل ✅' : 'قيد الانتظار ⏳'}
                   </button>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                   <div className="bg-gray-50 p-3 rounded-2xl text-center"><p className="text-[7px] text-gray-400 font-black uppercase">الخدمة</p><p className="text-[10px] font-black">{order.serviceType === 'wash_iron' ? 'غسيل ومكواة' : order.serviceType === 'iron_only' ? 'مكواة فقط' : 'غسيل فقط'}</p></div>
                   <div className="bg-gray-50 p-3 rounded-2xl text-center"><p className="text-[7px] text-gray-400 font-black uppercase">الكمية</p><p className="text-[10px] font-black">{order.pieces} قطعة</p></div>
                </div>
                <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                   <div className="flex gap-2">
                      <button onClick={() => openInMaps(order.location)} className="p-2 px-4 bg-blue-600 text-white rounded-xl text-[9px] font-black shadow-md">📍 الموقع</button>
                      <button onClick={() => deleteItem("laundry_orders", order.id)} className="p-2 px-4 bg-red-50 text-red-500 rounded-xl text-[9px] font-black">حذف</button>
                   </div>
                   <p className="text-sm font-black text-[#1E293B]">{order.totalPrice} <span className="text-[10px]">ج.س</span></p>
                </div>
              </div>
            ))}
            {laundryOrders.length === 0 && <div className="text-center py-20 opacity-30 font-black italic text-xs">لا توجد طلبات غسيل حالياً</div>}
          </div>
        )}

      </div>
    </div>
  );
}
