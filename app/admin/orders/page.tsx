"use client";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp, where, getDocs, limit 
} from "firebase/firestore";
import Link from "next/link";
// استيراد الدوال من ملف الاختصارات الخاص بك
import { showToast, handleUpdate, handleDelete } from "@/lib/utils";

const calculateDistance = (lat1: any, lon1: any, lat2: any, lon2: any) => {
  const pLat1 = parseFloat(lat1);
  const pLon1 = parseFloat(lon1);
  const pLat2 = parseFloat(lat2);
  const pLon2 = parseFloat(lon2);
  if (isNaN(pLat1) || isNaN(pLon1) || isNaN(pLat2) || isNaN(pLon2)) return null;
  const R = 6371; 
  const dLat = (pLat2 - pLat1) * Math.PI / 180;
  const dLon = (pLon2 - pLon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(pLat1 * Math.PI / 180) * Math.cos(pLat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function AdminOrdersPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [maids, setMaids] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [rating, setRating] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    document.body.style.overflow = showModal ? "hidden" : "unset";
  }, [showModal]);

  const getPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e: any) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    e.preventDefault();
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.stroke();
    e.preventDefault();
  };

  const fetchLastCrew = async (userId: string) => {
    if (!userId) return { m: null, v: null };
    const q = query(collection(db, "bookings"), where("userId", "==", userId), where("status", "==", "completed"), orderBy("actualFinishedAt", "desc"), limit(1));
    const s = await getDocs(q);
    return s.empty ? { m: null, v: null } : { m: s.docs[0].data().assignedMaid, v: s.docs[0].data().assignedVehicle };
  };

  // دالة الحفظ التلقائي باستخدام handleUpdate لإضافة updatedAt تلقائياً
  const autoSave = async (orderId: string, updates: any) => {
    try {
      const clean: any = {};
      Object.keys(updates).forEach(k => { if (updates[k] !== undefined) clean[k] = updates[k]; });
      await handleUpdate("bookings", orderId, clean);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const unsubB = onSnapshot(query(collection(db, "bookings"), orderBy("createdAt", "desc")), async (snap) => {
      const orders = await Promise.all(snap.docs.map(async (d) => {
        const data = { id: d.id, ...d.data() } as any;
        if (data.status === "pending" && data.userId && !data.suggestedMaid) {
          const last = await fetchLastCrew(data.userId);
          data.suggestedMaid = last.m;
          data.suggestedVehicle = last.v;
        }
        return data;
      }));
      setBookings(orders.filter(o => o.status !== "completed"));
    });
    onSnapshot(collection(db, "maids"), s => setMaids(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, "vehicles"), s => setVehicles(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsubB();
  }, []);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const getTimer = (order: any) => {
    if (!order.actualStartedAt) return "--:--:--";
    const startMs = order.actualStartedAt.seconds * 1000;
    const durationMs = (Number(order.totalHours || 4)) * 3600000;
    const end = startMs + durationMs;
    const diff = Math.max(0, Math.floor((end - now) / 1000));
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-right font-sans pb-32" dir="rtl">
      <div className="bg-[#1E293B] text-white p-8 rounded-b-[50px] shadow-2xl mb-8">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-black italic">لوحة التحكم الذكية 🛰️</h1>
          <Link href="/admin/orders/complete" className="bg-blue-600 px-5 py-2 rounded-2xl text-[10px] font-black">الأرشيف 📁</Link>
        </div>
      </div>

      <div className="px-6 max-w-4xl mx-auto space-y-6">
        {bookings.map(b => {
          const cLat = b.locationCoords?.lat;
          const cLng = b.locationCoords?.lng;
          const isBusy = (name: string) => bookings.some(o => o.status === "in-progress" && o.assignedMaid === name && o.id !== b.id);
          const sortedMaids = maids.map(m => ({
            ...m,
            dist: calculateDistance(cLat, cLng, m.location?.lat, m.location?.lng),
            isBusy: isBusy(m.name),
            isPrev: m.name === b.suggestedMaid
          })).sort((a, b) => (a.isPrev ? -1 : 1) || (a.isBusy ? 1 : -1) || (a.dist ?? 999) - (b.dist ?? 999));
          const sortedVehs = vehicles.map(v => ({
            ...v,
            dist: calculateDistance(cLat, cLng, v.location?.lat, v.location?.lng),
            isPrev: v.driverName === b.suggestedVehicle
          })).sort((a, b) => (a.isPrev ? -1 : 1) || (a.dist ?? 999) - (b.dist ?? 999));
          const curMaid = sortedMaids.find(m => m.name === (b.assignedMaid || b.suggestedMaid));
          const curVeh = sortedVehs.find(v => v.driverName === (b.assignedVehicle || b.suggestedVehicle));

          return (
            <div key={b.id} className="bg-white rounded-[40px] shadow-xl p-7 border border-gray-100 relative">
              <div className="absolute top-6 left-6 flex gap-2">
                {b.status === "in-progress" && (
                  <button onClick={() => handleUpdate("bookings", b.id, {status:"pending", targetEndTime:null})} className="bg-orange-100 text-orange-600 p-2 rounded-xl text-[9px] font-black">🛑 إيقاف</button>
                )}
                {/* استخدام handleDelete التي تطلب تأكيد الحذف تلقائياً */}
                <button onClick={() => handleDelete("bookings", b.id)} className="bg-red-100 text-red-600 p-2 rounded-xl text-[9px] font-black">🗑️ حذف</button>
              </div>
              
              <div className="mb-6">
                <h4 className="font-black text-xl text-gray-800 ml-20">{b.fullName}</h4>
                <div className="flex gap-2 mt-2">
                  <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black">{b.packageName}</span>
                  <a href={`tel:${b.phone}`} className="text-green-600 font-black text-[10px] self-center">📞 {b.phone}</a>
                </div>
              </div>

              <div className="bg-gray-50 rounded-3xl p-4 mb-6 border border-gray-100">
                <p className="text-[10px] font-black text-gray-600 mb-2">📍 {b.locationText || b.address}</p>
                {cLat && <a href={`https://www.google.com/maps?q=${cLat},${cLng}`} target="_blank" rel="noreferrer" className="text-[9px] text-blue-500 font-black underline">فتح موقع العميل 🗺️</a>}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="space-y-1">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[8px] font-black text-gray-400">العاملة</label>
                    <span className="text-[8px] font-black text-blue-600">{curMaid?.dist ? `${curMaid.dist.toFixed(1)} كم` : "---"}</span>
                  </div>
                  <select value={b.assignedMaid || b.suggestedMaid || ""} onChange={(e) => { const m = sortedMaids.find(x => x.name === e.target.value); autoSave(b.id, { assignedMaid: e.target.value, maidDist: m?.dist?.toFixed(2) }); }} className="w-full p-3 rounded-2xl text-[9px] font-black bg-gray-50 border-none outline-none">
                    <option value="">👤 اختيار عاملة</option>
                    {sortedMaids.map(m => <option key={m.id} value={m.name} disabled={m.isBusy}>{m.isPrev ? "⭐ " : ""}{m.name} {m.dist ? `(${m.dist.toFixed(1)} كم)` : ""} {m.isBusy ? "🔴" : "🟢"}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[8px] font-black text-gray-400">السائق</label>
                    <span className="text-[8px] font-black text-blue-600">{curVeh?.dist ? `${curVeh.dist.toFixed(1)} كم` : "---"}</span>
                  </div>
                  <select value={b.assignedVehicle || b.suggestedVehicle || ""} onChange={(e) => { const v = sortedVehs.find(x => x.driverName === e.target.value); autoSave(b.id, { assignedVehicle: e.target.value, driverDist: v?.dist?.toFixed(2) }); }} className="w-full p-3 rounded-2xl text-[9px] font-black bg-gray-50 border-none outline-none">
                    <option value="">🚗 اختيار سائق</option>
                    {sortedVehs.map(v => <option key={v.id} value={v.driverName}>{v.isPrev ? "⭐ " : ""}{v.driverName} {v.dist ? `(${v.dist.toFixed(1)} كم)` : ""}</option>)}
                  </select>
                </div>
              </div>

              {b.status === "in-progress" ? (
                <div className="bg-[#1E293B] rounded-[30px] p-6 text-center text-white">
                  {b.category !== 'monthly' ? (
                    <div className="text-3xl font-black mb-4 font-mono">{getTimer(b)}</div>
                  ) : (
                    <div className="text-lg font-black mb-4 italic text-blue-400">باقة متعددة (بدون عداد)</div>
                  )}
                  <button onClick={() => { setSelectedOrder(b); setShowModal(true); }} className="w-full bg-green-600 py-4 rounded-2xl font-black text-xs shadow-lg">إنهاء المهمة ✅</button>
                </div>
              ) : (
                <button onClick={async () => { 
                  const m = b.assignedMaid || b.suggestedMaid; 
                  const v = b.assignedVehicle || b.suggestedVehicle; 
                  if(!m || !v) return showToast("يرجى التعيين أولاً", "error"); 
                  const h = b.packageName?.includes("4") ? 4 : 8; 
                  await handleUpdate("bookings", b.id, { 
                    status: "in-progress", 
                    targetEndTime: Date.now() + (h*3600000), 
                    assignedMaid: m, 
                    assignedVehicle: v, 
                    actualStartedAt: serverTimestamp() 
                  });
                  showToast("تم بدء المهمة بنجاح", "success");
                }} className="w-full bg-[#1E293B] text-white py-5 rounded-3xl font-black text-xs">تـسـجـيـل الـبـدء 🚀</button>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
             <button onClick={() => setShowModal(false)} className="absolute top-6 left-6 text-red-500">✕</button>
             <h3 className="text-xl font-black text-center pt-4">إتمام الزيارة</h3>
             <div className="flex gap-2">
              {["ممتاز","جيد","سيء"].map(r => <button key={r} onClick={()=>setRating(r)} className={`flex-1 py-4 rounded-2xl text-[12px] font-black ${rating===r ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{r}</button>)}
            </div>
            <div className="border-4 border-dashed border-gray-200 rounded-[30px] overflow-hidden bg-white">
              <canvas 
                ref={canvasRef} 
                width={500} height={300} 
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={()=>setIsDrawing(false)}
                onMouseLeave={()=>setIsDrawing(false)}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={()=>setIsDrawing(false)}
                className="w-full h-64 touch-none cursor-crosshair" 
              />
            </div>
            <button 
              onClick={async () => {
                if(!rating) return showToast("التقييم مطلوب", "error");
                await handleUpdate("bookings", selectedOrder.id, { 
                  status: "completed", 
                  workerRating: rating, 
                  signature: canvasRef.current?.toDataURL(), 
                  actualFinishedAt: serverTimestamp() 
                });
                setShowModal(false);
              }}
              className="w-full bg-[#1E293B] text-white py-5 rounded-3xl font-black text-lg"
            >حفظ البيانات 💾</button>
          </div>
        </div>
      )}
    </div>
  );
}
