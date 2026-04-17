"use client";
import { useState, useEffect, useRef } from "react";
import dynamic from 'next/dynamic';
import { db } from "@/lib/firebase";
import { 
  collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp, where, getDocs, limit, addDoc 
} from "firebase/firestore";
import Link from "next/link";
import { showToast, handleUpdate, handleDelete } from "@/lib/utils";

const LiveTrackingModal = dynamic(() => import("@/components/LiveTrackingModal"), {
  ssr: false, 
  loading: () => null 
});

const ARABIC_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const calculateDistance = (lat1: any, lon1: any, lat2: any, lon2: any) => {
  const pLat1 = parseFloat(lat1); const pLon1 = parseFloat(lon1);
  const pLat2 = parseFloat(lat2); const pLon2 = parseFloat(lon2);
  if (isNaN(pLat1) || isNaN(pLon1) || isNaN(pLat2) || isNaN(pLon2)) return null;
  const R = 6371; 
  const dLat = (pLat2 - pLat1) * Math.PI / 180;
  const dLon = (pLon2 - pLon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(pLat1 * Math.PI / 180) * Math.cos(pLat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

export default function AdminOrdersPage() {
  const adminType = "super"; 

  const [bookings, setBookings] = useState<any[]>([]);
  const [maids, setMaids] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [rating, setRating] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showLiveMap, setShowLiveMap] = useState(false);
  const [activeOrderForMap, setActiveOrderForMap] = useState<any>(null);
  const [now, setNow] = useState(Date.now());
  const [visitsData, setVisitsData] = useState<any>({}); 

  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const getPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const fetchLastCrew = async (userId: string) => {
    if (!userId) return { m: null, v: null };
    const q = query(collection(db, "contracts"), where("userId", "==", userId), where("status", "in", ["completed", "completed_for_today"]), orderBy("actualFinishedAt", "desc"), limit(1));
    const s = await getDocs(q);
    return s.empty ? { m: null, v: null } : { m: s.docs[0].data().assignedMaid, v: s.docs[0].data().assignedVehicle };
  };

  const autoSave = async (orderId: string, updates: any, targetCollection: string = "contracts") => {
    try {
      const clean: any = {};
      Object.keys(updates).forEach(k => { if (updates[k] !== undefined) clean[k] = updates[k]; });
      await handleUpdate(targetCollection, orderId, clean);
    } catch (err) { console.error(err); }
  };

  const loadVisits = async (contractId: string) => {
    const q = query(collection(db, "contracts", contractId, "visits"), orderBy("visitDate", "desc"));
    const snap = await getDocs(q);
    const visits = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setVisitsData((prev: any) => ({ ...prev, [contractId]: visits }));
  };

  const handleDeleteVisit = async (contractId: string, visitId: string) => {
    if (confirm("هل أنت متأكد من حذف هذه الزيارة من السجل؟")) {
      try {
        await deleteDoc(doc(db, "contracts", contractId, "visits", visitId));
        showToast("تم حذف الزيارة بنجاح");
        loadVisits(contractId); 
      } catch (error) {
        showToast("خطأ في الحذف", "error");
      }
    }
  };

  useEffect(() => {
    const normalize = (txt: string) => txt ? txt.replace(/[أإآ]/g, "ا").trim() : "";
    const selectedDayName = ARABIC_DAYS[new Date(filterDate).getDay()];
    const normalizedSelectedDay = normalize(selectedDayName);
    
    const realTodayStart = new Date();
    realTodayStart.setHours(0, 0, 0, 0);
    const realTodayEnd = new Date();
    realTodayEnd.setHours(23, 59, 59, 999);

    const fetchFromCollection = (collectionName: string) => {
      return onSnapshot(query(collection(db, collectionName), orderBy("createdAt", "desc")), async (snap) => {
        const raw = await Promise.all(snap.docs.map(async (d) => {
          const data = { id: d.id, ...d.data(), sourceCollection: collectionName } as any;

          let hasVisitToday = false;
          if (collectionName === "contracts") {
            const vQuery = query(
              collection(db, "contracts", d.id, "visits"),
              where("visitDate", ">=", realTodayStart),
              where("visitDate", "<=", realTodayEnd),
              limit(1)
            );
            const vSnap = await getDocs(vQuery);
            hasVisitToday = !vSnap.empty;
          }

          if (data.status === "pending" && data.userId && !data.suggestedMaid) {
            const last = await fetchLastCrew(data.userId);
            data.suggestedMaid = last.m;
            data.suggestedVehicle = last.v;
          }
          if (data.type === 'monthly_contract' || data.category === 'monthly_contract') {
             loadVisits(data.id);
          }
          return { ...data, hasVisitToday };
        }));

        setBookings(prev => {
          const other = prev.filter(p => p.sourceCollection !== collectionName);
          const combined = [...other, ...raw];
          
          return combined.filter(order => {
            const type = order.type || order.category;
            if (filterType !== "all") {
              if (filterType === "single" && type !== "single") return false;
              if (filterType === "monthly_contract" && type !== "monthly_contract") return false;
            }

            if (type !== "monthly_contract") {
                if (order.startDate !== filterDate) return false;
                return order.status !== "completed";
            } else {
                if (order.contractStartDate) {
                    const startMs = order.contractStartDate.seconds * 1000;
                    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
                    if (Date.now() > (startMs + thirtyDaysMs)) return false;
                }
                const hasDay = order.selectedDays?.some((day: string) => normalize(day) === normalizedSelectedDay);
                return hasDay && order.status !== "contract_finished";
            }
          }).sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
        });
      });
    };

    const unsubContracts = fetchFromCollection("contracts");
    const unsubBookings = fetchFromCollection("bookings");

    onSnapshot(collection(db, "maids"), s => setMaids(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, "vehicles"), s => setVehicles(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    return () => { unsubContracts(); unsubBookings(); };
  }, [filterDate, filterType]);

  const getTimer = (order: any) => {
    if (!order.actualStartedAt) return "00:00:00";
    const startMs = order.actualStartedAt.seconds * 1000;
    const durationMs = (Number(order.totalHours || 5)) * 3600000;
    const diff = Math.max(0, Math.floor(((startMs + durationMs) - now) / 1000));
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatOrderTime = (timestamp: any) => {
    if (!timestamp) return "غير متوفر";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-right font-sans pb-32" dir="rtl">
      <div className="bg-[#1E293B] text-white p-8 rounded-b-[50px] shadow-2xl mb-8">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-black italic">لوحة الإدارة الذكية 🛰️</h1>
          <Link href="/admin/orders/complete" className="bg-blue-600 px-5 py-2 rounded-2xl text-[10px] font-black">الأرشيف 📁</Link>
        </div>
      </div>

      <div className="px-6 max-w-4xl mx-auto mb-8 grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
            <label className="block text-[10px] font-black text-gray-400 mb-2 mr-2">تاريخ التنفيذ</label>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full bg-transparent text-xs font-black outline-none" />
        </div>
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
            <label className="block text-[10px] font-black text-gray-400 mb-2 mr-2">نوع الخدمة</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full bg-transparent text-xs font-black outline-none">
                <option value="all">الكل</option>
                <option value="single">زيارة عابرة</option>
                <option value="monthly_contract">عقد شهري</option>
            </select>
        </div>
      </div>

      <div className="px-6 max-w-4xl mx-auto space-y-6">
        {bookings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-gray-100">
             <p className="text-gray-400 font-black italic text-sm">لا توجد طلبات لهذا التاريخ أو النوع 🔍</p>
          </div>
        ) : bookings.map(b => {
          const cLat = b.locationCoords?.lat; const cLng = b.locationCoords?.lng;
          const isBusy = (name: string) => bookings.some(o => o.status === "in-progress" && o.assignedMaid === name && o.id !== b.id);
          const sortedMaids = maids.map(m => ({
            ...m, dist: calculateDistance(cLat, cLng, m.location?.lat, m.location?.lng),
            isBusy: isBusy(m.name), isPrev: m.name === b.suggestedMaid
          })).sort((a, b) => (a.isPrev ? -1 : 1) || (a.isBusy ? 1 : -1) || (a.dist ?? 999) - (b.dist ?? 999));
          const sortedVehs = vehicles.map(v => ({
            ...v, dist: calculateDistance(cLat, cLng, v.location?.lat, v.location?.lng),
            isPrev: v.driverName === b.suggestedVehicle
          })).sort((a, b) => (a.isPrev ? -1 : 1) || (a.dist ?? 999) - (b.dist ?? 999));
          const curVeh = sortedVehs.find(v => v.driverName === (b.assignedVehicle || b.suggestedVehicle));

          return (
            <div key={b.id} className={`bg-white rounded-[40px] shadow-xl p-7 border-2 relative ${(b.type === 'monthly_contract' || b.category === 'monthly_contract') ? 'border-blue-100' : 'border-gray-50'}`}>
              <div className="absolute top-6 left-6 flex gap-2">
                {b.status === "in-progress" && (
                  <button onClick={() => handleUpdate(b.sourceCollection, b.id, {status:"pending"})} className="bg-orange-100 text-orange-600 p-2 rounded-xl text-[9px] font-black italic">🛑 إيقاف</button>
                )}
                <button onClick={() => handleDelete(b.sourceCollection, b.id)} className="bg-red-50 text-red-500 p-2 rounded-xl text-[9px] font-black italic">🗑️ حذف</button>
              </div>
              
              <div className="mb-6">
                <div className="flex flex-col gap-1 mb-2">
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-0.5 rounded-full text-[8px] font-black ${(b.type === 'monthly_contract' || b.category === 'monthly_contract') ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                            {(b.type === 'monthly_contract' || b.category === 'monthly_contract') ? 'عقد شهري 🗓️' : 'زيارة عابرة ✨'}
                        </span>
                        <span className="text-[8px] font-black text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg flex items-center gap-1">🕒 {formatOrderTime(b.createdAt)}</span>
                    </div>
                    <p className="text-[8px] font-bold text-blue-500 mr-2 uppercase tracking-tighter">تاريخ الطلب: {formatOrderTime(b.createdAt).split(',')[0]}</p>
                </div>
                <div className="flex items-center gap-3">
                  <h4 className="font-black text-xl text-gray-800">{b.fullName || b.userName}</h4>
                  <a href={`https://wa.me/${b.phone?.replace(/\s/g, '')}`} target="_blank" className="bg-green-500 text-white p-2 rounded-full text-xs shadow-md active:scale-95 transition-all">💬</a>
                </div>
                <a href={`tel:${b.phone}`} className="text-green-600 font-black text-[10px] mt-1 block">📞 {b.phone}</a>
              </div>

              {(b.type === 'monthly_contract' || b.category === 'monthly_contract') && visitsData[b.id] && (
                <div className="mb-6 bg-blue-50/50 rounded-2xl p-3 border border-blue-100">
                    <p className="text-[9px] font-black text-blue-800 mb-2">📊 سجل الزيارات المكتملة:</p>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {visitsData[b.id].map((v: any, idx: number) => (
                            <div key={v.id} className="min-w-[80px] bg-white p-2 rounded-xl shadow-sm text-center relative group">
                                {adminType === "super" && (
                                  <button onClick={() => handleDeleteVisit(b.id, v.id)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[8px] flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                                )}
                                <p className="text-[8px] font-black text-gray-800">زيارة #{visitsData[b.id].length - idx}</p>
                                <p className="text-[7px] text-gray-400">{v.visitDate ? formatOrderTime(v.visitDate).split(',')[0] : '-'}</p>
                                <span className="text-[8px] text-green-600 font-bold">{v.rating}</span>
                            </div>
                        ))}
                    </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-3xl p-4 mb-6 border border-gray-100 flex justify-between items-center">
                <p className="text-[10px] font-black text-gray-600 flex-1">📍 {b.locationText || b.address}</p>
                <button onClick={() => { setActiveOrderForMap({ ...b, curVeh }); setShowLiveMap(true); }} className="bg-[#1E293B] text-white px-5 py-2 rounded-2xl text-[10px] font-black shadow-lg">تتبع 📡</button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                  <select value={b.assignedMaid || b.suggestedMaid || ""} onChange={(e) => { const m = sortedMaids.find(x => x.name === e.target.value); autoSave(b.id, { assignedMaid: e.target.value, maidDist: m?.dist?.toFixed(2) }, b.sourceCollection); }} className="p-3 rounded-2xl text-[9px] font-black bg-gray-50 border-none outline-none">
                    <option value="">👤 العاملة</option>
                    {sortedMaids.map(m => <option key={m.id} value={m.name} disabled={m.isBusy}>{m.isPrev ? "⭐ " : ""}{m.name} {m.dist ? `(${m.dist.toFixed(1)} كم)` : ""}</option>)}
                  </select>
                  <select value={b.assignedVehicle || b.suggestedVehicle || ""} onChange={(e) => { const v = sortedVehs.find(x => x.driverName === e.target.value); autoSave(b.id, { assignedVehicle: e.target.value, driverDist: v?.dist?.toFixed(2) }, b.sourceCollection); }} className="p-3 rounded-2xl text-[9px] font-black bg-gray-50 border-none outline-none">
                    <option value="">🚗 السائق</option>
                    {sortedVehs.map(v => <option key={v.id} value={v.driverName}>{v.isPrev ? "⭐ " : ""}{v.driverName} {v.dist ? `(${v.dist.toFixed(1)} كم)` : ""}</option>)}
                  </select>
              </div>

              {b.status === "in-progress" ? (
                <div className="bg-[#1E293B] rounded-[30px] p-6 text-center text-white">
                  <div className={`text-3xl font-black mb-4 font-mono ${getTimer(b) === "00:00:00" ? "text-red-500 animate-pulse" : ""}`}>{getTimer(b)}</div>
                  <button onClick={() => { setSelectedOrder(b); setShowModal(true); }} className="w-full bg-green-600 py-4 rounded-2xl font-black text-xs shadow-lg">إنهاء المهمة ✅</button>
                </div>
              ) : (
                <button 
                  disabled={b.hasVisitToday}
                  onClick={async () => { 
                    const m = b.assignedMaid || b.suggestedMaid; const v = b.assignedVehicle || b.suggestedVehicle; 
                    if(!m || !v) return showToast("يرجى التعيين أولاً", "error"); 
                    const updates: any = { status: "in-progress", assignedMaid: m, assignedVehicle: v, actualStartedAt: serverTimestamp() };
                    if ((b.type === "monthly_contract" || b.category === "monthly_contract") && !b.contractStartDate) updates.contractStartDate = serverTimestamp();
                    await handleUpdate(b.sourceCollection, b.id, updates);
                    showToast("تم بدء المهمة 🚀");
                  }} 
                  className={`w-full py-5 rounded-3xl font-black text-xs transition-all ${b.hasVisitToday ? 'bg-gray-300 text-gray-500 cursor-not-allowed border-2 border-gray-100' : 'bg-[#1E293B] text-white'}`}
                >
                  {b.hasVisitToday ? "تم إكمال زيارة اليوم ✅" : (b.status === "completed_for_today" ? "بدء الزيارة التالية 🔄" : "تـسـجـيـل الـبـدء 🚀")}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {showLiveMap && <LiveTrackingModal isOpen={showLiveMap} onClose={() => setShowLiveMap(false)} order={activeOrderForMap} />}

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
             <button onClick={() => setShowModal(false)} className="absolute top-6 left-6 text-red-500 font-black">✕</button>
             <h3 className="text-xl font-black text-center pt-4">إتمام الزيارة وتوثيق العمل</h3>
             <div className="flex gap-2">
              {["ممتاز","جيد","سيء"].map(r => <button key={r} onClick={()=>setRating(r)} className={`flex-1 py-4 rounded-2xl text-[12px] font-black ${rating===r ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{r}</button>)}
            </div>
            <div className="border-4 border-dashed border-gray-100 rounded-[30px] overflow-hidden bg-slate-50">
              <canvas ref={canvasRef} width={500} height={300} onMouseDown={(e)=> { const ctx=canvasRef.current?.getContext("2d"); if(ctx){ setIsDrawing(true); const p=getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineWidth=3; ctx.lineCap="round"; ctx.strokeStyle="#000"; } }} onMouseMove={(e)=> { if(isDrawing){ const ctx=canvasRef.current?.getContext("2d"); if(ctx){ const p=getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); } } }} onMouseUp={()=>setIsDrawing(false)} onTouchStart={(e)=> { const ctx=canvasRef.current?.getContext("2d"); if(ctx){ setIsDrawing(true); const p=getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); } }} onTouchMove={(e)=> { if(isDrawing){ const ctx=canvasRef.current?.getContext("2d"); if(ctx){ const p=getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); } } }} onTouchEnd={()=>setIsDrawing(false)} className="w-full h-64 touch-none cursor-crosshair" />
            </div>
            <button onClick={async () => {
                if(!rating) return showToast("التقييم مطلوب", "error");
                const isMonthly = selectedOrder.type === "monthly_contract" || selectedOrder.category === "monthly_contract";
                const sig = canvasRef.current?.toDataURL();
                
                if (isMonthly) {
                    await addDoc(collection(db, "contracts", selectedOrder.id, "visits"), {
                        visitDate: serverTimestamp(),
                        signature: sig,
                        rating: rating,
                        startedAt: selectedOrder.actualStartedAt,
                        finishedAt: serverTimestamp(),
                        staff: selectedOrder.assignedMaid || "غير محدد"
                    });
                }

                const updates = { 
                  status: isMonthly ? "completed_for_today" : "completed", 
                  workerRating: rating, signature: sig, actualFinishedAt: serverTimestamp() 
                };

                await handleUpdate(selectedOrder.sourceCollection, selectedOrder.id, updates);

                setShowModal(false);
                showToast(isMonthly ? "تم تسجيل الزيارة ✅" : "تم إنهاء الزيارة بنجاح ✅");
              }} className="w-full bg-[#1E293B] text-white py-5 rounded-3xl font-black text-lg">حفظ وإغلاق 💾</button>
          </div>
        </div>
      )}
    </div>
  );
}
