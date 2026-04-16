"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, query, where, onSnapshot, orderBy 
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { showToast, handleDelete, handleUpdate, getFromLocal } from "@/lib/utils";

const ARABIC_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default function CompletedOrdersPage() {
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [searchDate, setSearchDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const role = getFromLocal("userRole");
    setUserRole(role);
  }, []);

  // دالة لجلب اسم اليوم باللغة العربية
  const getDayName = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return ARABIC_DAYS[date.getDay()];
  };

  const calculateDuration = (start: any, end: any) => {
    if (!start || !end) return "توقيت غير مكتمل";
    const startMs = start.seconds * 1000;
    const endMs = end.seconds * 1000;
    const diffMs = endMs - startMs;
    if (diffMs < 0) return "خطأ في ترتيب التوقيت";

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `المدة: ${days} أيام و ${hours % 24} ساعة`;
    } 
    return `المدة: ${hours} ساعة و ${minutes} دقيقة`;
  };

  useEffect(() => {
    const q = query(
      collection(db, "bookings"), 
      where("status", "in", ["completed", "completed_for_today", "contract_finished"])
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const sorted = docs.sort((a, b) => (b.actualFinishedAt?.seconds || 0) - (a.actualFinishedAt?.seconds || 0));
      setCompletedOrders(sorted);
      setFilteredOrders(sorted);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (searchDate) {
      const filtered = completedOrders.filter(o => o.startDate === searchDate);
      setFilteredOrders(filtered);
    } else {
      setFilteredOrders(completedOrders);
    }
  }, [searchDate, completedOrders]);

  const confirmDelete = async (id: string) => {
    const success = await handleDelete("bookings", id);
    if (success) {
      setFilteredOrders(prev => prev.filter(o => o.id !== id));
      setCompletedOrders(prev => prev.filter(o => o.id !== id));
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black italic opacity-30 tracking-widest text-sm">جاري عرض الأرشيف التفصيلي...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-right font-sans" dir="rtl">
      
      <div className="bg-[#1E293B] p-8 rounded-b-[50px] shadow-2xl text-white mb-8 border-b-4 border-blue-600">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black italic tracking-tight">سجل العمليات المكتملة</h1>
            <p className="text-blue-400 text-[10px] font-bold mt-1 uppercase tracking-widest">Full Completion History</p>
          </div>
          <button onClick={() => router.push('/admin/orders')} className="bg-white/10 px-5 py-2.5 rounded-2xl text-[10px] font-black border border-white/10">الطلبات النشطة ←</button>
        </div>
      </div>

      <div className="px-5 space-y-6">
        
        <div className="bg-white p-5 rounded-[30px] shadow-sm border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 mb-2 mr-2 italic">تصفية حسب التاريخ:</p>
            <input 
                type="date" 
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="w-full bg-gray-50 p-4 rounded-2xl outline-none text-xs font-black text-[#1E293B] border border-gray-100"
            />
        </div>

        <div className="space-y-6">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-gray-100 shadow-inner">
               <p className="text-gray-300 font-black italic text-sm">لا توجد سجلات مكتملة حالياً</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.id} className={`bg-white rounded-[45px] p-8 shadow-sm border-2 relative overflow-hidden transition-all hover:shadow-xl group ${order.type === 'monthly_contract' ? 'border-blue-50' : 'border-gray-50'}`}>
                
                {userRole === "super" && (
                  <button 
                    onClick={() => confirmDelete(order.id)}
                    className="absolute top-6 left-6 bg-red-50 text-red-500 w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90 border border-red-100 shadow-sm z-10"
                  >
                    🗑️
                  </button>
                )}

                <div className="flex justify-between items-start mb-6">
                  <div className={userRole === "super" ? "mr-10" : ""}>
                    <div className="flex items-center gap-2">
                       <h3 className="font-black text-gray-800 text-xl leading-none italic">{order.fullName || "عميل مجهول"}</h3>
                       {/* عرض اليوم المكتمل */}
                       <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-xl text-[10px] font-black italic shadow-sm">
                         {getDayName(order.actualFinishedAt)}
                       </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className={`px-4 py-1 rounded-full text-[9px] font-black border shadow-sm ${order.status === 'completed' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-600 text-white border-blue-700'}`}>
                          {order.status === 'completed' ? 'مكتمل بنجاح ✅' : 'زيارة عقد مكتملة 🗓️'}
                        </span>
                        <span className="bg-gray-50 text-gray-500 px-4 py-1 rounded-full text-[9px] font-black border border-gray-100 italic">{order.type === 'monthly_contract' ? 'عقد شهري' : (order.packageName || 'طلب عابر')}</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-[12px] font-black text-[#1E293B] bg-gray-50 px-4 py-2 rounded-2xl" dir="ltr">{order.phone}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50/80 p-4 rounded-[25px] border border-gray-100">
                      <p className="text-[8px] text-gray-400 font-black mb-1 italic">بدأت في:</p>
                      <p className="text-[11px] font-black text-gray-700">
                        {order.actualStartedAt?.toDate().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="bg-gray-50/80 p-4 rounded-[25px] border border-gray-100">
                      <p className="text-[8px] text-gray-400 font-black mb-1 italic">انتهت في:</p>
                      <p className="text-[11px] font-black text-gray-700">
                        {order.actualFinishedAt?.toDate().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="bg-blue-600/5 border border-blue-600/10 p-4 rounded-[25px] text-center shadow-inner">
                    <p className="text-[12px] font-black text-blue-700 italic tracking-tighter">
                       ⏱️ {calculateDuration(order.actualStartedAt, order.actualFinishedAt)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6 bg-[#1E293B]/5 p-5 rounded-[30px] border border-gray-100">
                  <div className="text-center border-l border-gray-200">
                    <p className="text-[8px] text-gray-400 font-black mb-1 uppercase">👩‍💼 العاملة</p>
                    <p className="text-[10px] font-black text-gray-800">{order.assignedMaid || "---"}</p>
                  </div>
                  <div className="text-center border-l border-gray-200">
                    <p className="text-[8px] text-gray-400 font-black mb-1 uppercase">🚐 السائق</p>
                    <p className="text-[10px] font-black text-gray-800">{order.assignedVehicle || order.AssignedVehicle || "---"}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] text-blue-500 font-black mb-1 uppercase">👤 المشرف</p>
                    <p className="text-[10px] font-black text-blue-700 italic">{order.completedBy || "إغلاق تلقائي"}</p>
                  </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-3xl text-[11px] font-bold text-gray-600 italic border border-gray-100">
                        📍 الموقع: {order.locationText || order.address}
                    </div>

                    {order.signature && (
                    <div className="p-4 bg-white rounded-[30px] border border-gray-50 text-center shadow-sm relative">
                        <p className="text-[8px] text-gray-300 font-black mb-2 uppercase italic tracking-widest">التوقيع الرقمي المعتمد</p>
                        <img src={order.signature} className="h-16 mx-auto mix-blend-multiply opacity-70 grayscale hover:grayscale-0 transition-all" alt="Sign" />
                    </div>
                    )}
                </div>

                <div className="flex justify-between items-center px-2 pt-6 mt-4 border-t border-gray-50">
                    <p className="text-[9px] text-gray-300 font-black italic tracking-tighter">UUID: {order.id.slice(0,8).toUpperCase()}</p>
                    <button 
                      onClick={() => window.open(`https://wa.me/249${order.phone?.replace(/^0/, '')}`)}
                      className="bg-[#1E293B] text-white px-6 py-3 rounded-2xl font-black text-[10px] shadow-lg flex items-center gap-2"
                    >
                      مراسلة العميل 💬
                    </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
