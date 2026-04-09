"use client";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp, where, getDocs, limit 
} from "firebase/firestore";
import Link from "next/link";

export default function AdminOrdersPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [maids, setMaids] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(""); 
  const [endDate, setEndDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [rating, setRating] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [adminName, setAdminName] = useState("إبراهيم عبدالله"); 

  // --- دالة ذكية لجلب آخر عاملة خدم القيمة لهذا العميل ---
  const fetchLastMaidForUser = async (userId: string) => {
    if (!userId) return null;
    const q = query(
      collection(db, "bookings"),
      where("userId", "==", userId),
      where("status", "==", "completed"),
      orderBy("actualFinishedAt", "desc"),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data().assignedMaid;
    }
    return null;
  };

  useEffect(() => {
    const unsubB = onSnapshot(query(collection(db, "bookings"), orderBy("createdAt", "desc")), async (s) => {
      const allDocs = s.docs.map(d => ({ id: d.id, ...d.data() }));
      const activeOrders = allDocs.filter(b => b.status !== "completed");

      // تطبيق ميزة "العاملة المفضلة" تلقائياً للطلبات الجديدة فقط
      const updatedOrders = await Promise.all(activeOrders.map(async (order) => {
        if (!order.assignedMaid && order.userId) {
          const lastMaid = await fetchLastMaidForUser(order.userId);
          if (lastMaid) {
             // تحديث محلي فقط ليظهر للمشرف كاختيار مقترح
             return { ...order, lastMaidSuggestion: lastMaid };
          }
        }
        return order;
      }));

      setBookings(updatedOrders);
    });

    const unsubM = onSnapshot(collection(db, "maids"), (s) => setMaids(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubV = onSnapshot(collection(db, "vehicles"), (s) => setVehicles(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    return () => { unsubB(); unsubM(); unsubV(); };
  }, []);

  useEffect(() => {
    let result = bookings;
    if (searchTerm) result = result.filter(b => b.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || b.phone?.includes(searchTerm));
    if (startDate && endDate) {
      result = result.filter(b => (b.startDate || b.serviceDate) >= startDate && (b.startDate || b.serviceDate) <= endDate);
    }
    if (typeFilter !== "all") {
      result = result.filter(b => typeFilter === "hourly" ? b.category === "single" : b.category !== "single");
    }
    setFilteredBookings(result);
  }, [searchTerm, startDate, endDate, typeFilter, bookings]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const getRemainingTime = (targetTime: any) => {
    if (!targetTime) return { text: "0:00:00", seconds: 0 };
    const endTime = targetTime?.seconds ? targetTime.seconds * 1000 : Number(targetTime);
    const diff = Math.max(0, Math.floor((endTime - now) / 1000));
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return { text: `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`, seconds: diff };
  };

  const finalizeOrder = async () => {
    if (!rating || !selectedOrder) return alert("يرجى اختيار التقييم أولاً");
    const sig = canvasRef.current?.toDataURL();
    try {
      await updateDoc(doc(db, "bookings", selectedOrder.id), {
        signature: sig, status: "completed", workerRating: rating, actualFinishedAt: serverTimestamp(), completedBy: adminName,
      });
      setShowModal(false); setSelectedOrder(null); setRating("");
    } catch (err) { alert("خطأ في الحفظ"); }
  };

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    const ctx = canvas.getContext("2d");
    if(ctx){ 
      ctx.beginPath(); 
      ctx.moveTo(x, y); 
      setIsDrawing(true); 
    }
    if(e.touches) e.preventDefault(); // منع السكرول عند بدء اللمس
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    const ctx = canvas.getContext("2d");
    if(ctx){ 
      ctx.lineTo(x, y); 
      ctx.lineWidth = 3; 
      ctx.stroke(); 
    }
    if(e.touches) e.preventDefault(); // الحل الجذري لمنع تحرك الصفحة (Scroll) أثناء الرسم باللمس
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-right font-sans pb-32" dir="rtl">
      <div className="bg-[#1E293B] text-white p-8 rounded-b-[50px] shadow-2xl mb-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
               <h1 className="text-xl font-black italic">إدارة الميدان الذكية</h1>
               <p className="text-[10px] text-blue-400 font-bold mt-1">المشرف الحالي: {adminName} ✨</p>
            </div>
            <Link href="/admin/orders/complete" className="bg-blue-600 px-5 py-2 rounded-xl text-[10px] font-black shadow-lg">الأرشيف 📁</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <input type="text" placeholder="🔍 بحث..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="bg-white/10 p-3 rounded-2xl text-xs outline-none" />
            <select value={typeFilter} onChange={(e)=>setTypeFilter(e.target.value)} className="bg-white/10 p-3 rounded-2xl text-[10px] outline-none text-blue-300 font-black">
              <option value="all">جميع الأنظمة</option>
              <option value="hourly">نظام الساعات</option>
              <option value="contract">العقود</option>
            </select>
            <input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="bg-white/5 p-3 rounded-2xl text-[10px]" />
            <input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="bg-white/5 p-3 rounded-2xl text-[10px]" />
          </div>
        </div>
      </div>

      <div className="px-6 max-w-4xl mx-auto space-y-6">
        {filteredBookings.map(b => {
          const isHourly = b.category === "single"; 
          const timer = isHourly ? getRemainingTime(b.targetEndTime) : null;

          return (
            <div key={b.id} className="bg-white rounded-[40px] shadow-sm p-7 border border-gray-100 relative">
              
              {!b.assignedMaid && b.lastMaidSuggestion && (
                <div className="absolute top-4 left-10 bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[8px] font-black animate-pulse">
                  💡 العميل يفضل: {b.lastMaidSuggestion}
                </div>
              )}

              <div className="flex justify-between items-start mb-5">
                <div>
                  <h4 className="font-black text-lg text-gray-800">{b.fullName}</h4>
                  <div className="flex gap-2 mt-2">
                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black italic">{b.packageName}</span>
                  </div>
                </div>
                <div className="text-left text-[10px] font-black text-gray-400">
                   {b.startDate || b.serviceDate}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <select 
                  value={b.assignedMaid || b.lastMaidSuggestion || ""} 
                  onChange={(e)=>updateDoc(doc(db,"bookings",b.id),{assignedMaid:e.target.value})} 
                  className={`p-3 rounded-2xl text-[9px] font-black outline-none border transition-all ${!b.assignedMaid && b.lastMaidSuggestion ? 'border-orange-300 bg-orange-50' : 'bg-gray-50 border-gray-100'}`}
                >
                  <option value="">👤 اختيار العاملة</option>
                  {maids.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}
                </select>

                <select value={b.assignedVehicle || ""} onChange={(e)=>updateDoc(doc(db,"bookings",b.id),{assignedVehicle:e.target.value})} className="bg-gray-50 p-3 rounded-2xl text-[9px] font-black outline-none border border-gray-100">
                  <option value="">🚗 اختيار السائق</option>
                  {vehicles.map(v=><option key={v.id} value={v.driverName}>{v.driverName}</option>)}
                </select>
              </div>

              {b.status === "in-progress" ? (
                <div className="bg-[#1E293B] rounded-[30px] p-6 text-center text-white">
                   {isHourly ? (
                     <>
                        <h2 className="text-4xl font-black mb-6">{timer?.text}</h2>
                        <button onClick={() => { setSelectedOrder(b); setShowModal(true); }} className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-xs">إغلاق المهمة ✅</button>
                     </>
                   ) : (
                     <button onClick={() => { setSelectedOrder(b); setShowModal(true); }} className="w-full bg-red-500 text-white py-4 rounded-2xl font-black text-xs">إنهاء الزيارة 🛑</button>
                   )}
                </div>
              ) : (
                <button 
                  onClick={async () => {
                    const finalMaid = b.assignedMaid || b.lastMaidSuggestion;
                    if(!finalMaid || !b.assignedVehicle) return alert("يرجى تعيين الطاقم");
                    
                    const packageHours = b.packageName?.includes("4") ? 4 : b.packageName?.includes("8") ? 8 : 4;
                    const target = Date.now() + (packageHours * 60 * 60 * 1000);
                    
                    await updateDoc(doc(db, "bookings", b.id), { 
                      status: "in-progress", 
                      targetEndTime: target, 
                      assignedMaid: finalMaid, 
                      actualStartedAt: serverTimestamp(),
                      startedBy: adminName 
                    });
                  }} 
                  className="w-full bg-[#1E293B] text-white py-5 rounded-3xl font-black text-xs shadow-xl"
                >
                  تسجيل بدء الزيارة 🚀
                </button>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 space-y-6 shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-6 left-6 text-gray-300">✕</button>
            <h3 className="text-xl font-black text-center text-gray-800">تقرير إتمام الزيارة</h3>
            <div className="flex justify-center gap-1">
                {["ممتاز","جيد جدا","جيد","سيء"].map(r => (
                  <button key={r} onClick={()=>setRating(r)} className={`flex-1 py-3 rounded-xl text-[10px] font-black ${rating===r ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>{r}</button>
                ))}
            </div>
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[30px] overflow-hidden">
                <canvas 
                  ref={canvasRef} 
                  width={400} 
                  height={200} 
                  onMouseDown={startDrawing} 
                  onMouseMove={draw} 
                  onMouseUp={()=>setIsDrawing(false)} 
                  onTouchStart={startDrawing} 
                  onTouchMove={draw} 
                  onTouchEnd={()=>setIsDrawing(false)} 
                  className="w-full h-52 cursor-crosshair touch-none" 
                />
            </div>
            <button onClick={finalizeOrder} className="w-full bg-[#1E293B] text-white py-5 rounded-[25px] font-black text-sm shadow-2xl">تأكيد الإنهاء 💾</button>
          </div>
        </div>
      )}
    </div>
  );
}
