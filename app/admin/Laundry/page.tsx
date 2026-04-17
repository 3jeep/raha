"use client";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp 
} from "firebase/firestore";
import Link from "next/link";

export default function AdminLaundryPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]); 
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // حالات المودال والتحكم
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [assignedDriver, setAssignedDriver] = useState(""); 
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const adminName = "إبراهيم عبدالله"; 

  useEffect(() => {
    // 1. جلب الطلبات النشطة (غير المكتملة)
    const q = query(collection(db, "laundry_orders"), orderBy("createdAt", "desc"));
    const unsubOrders = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(all.filter(o => o.status !== "completed"));
    });

    // 2. جلب السائقين من مجموعة المركبات (نفس نظام الأدمن العام)
    const unsubVehicles = onSnapshot(collection(db, "vehicles"), (s) => {
      setVehicles(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubOrders(); unsubVehicles(); };
  }, []);

  // منطق الفلترة والبحث
  useEffect(() => {
    let result = orders;
    if (searchTerm) {
      result = result.filter(o => 
        o.userName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        o.orderNumber?.toString().includes(searchTerm)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter(o => o.status === statusFilter);
    }
    setFilteredOrders(result);
  }, [searchTerm, statusFilter, orders]);

  // دالة تنسيق التاريخ
  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return "---";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleString('ar-EG', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // دالة إغلاق الطلب (تسليم نهائي)
  const finalizeDelivery = async () => {
    if (!assignedDriver) return alert("يرجى اختيار السائق الموصل أولاً");
    const signature = canvasRef.current?.toDataURL();
    
    try {
      await updateDoc(doc(db, "laundry_orders", selectedOrder.id), {
        status: "completed",
        customerSignature: signature,
        deliveredByDriver: assignedDriver,
        finalizedByAdmin: adminName,
        actualDeliveredAt: serverTimestamp(),
        isRated: false 
      });
      setShowDeliveryModal(false);
      setSelectedOrder(null);
      setAssignedDriver("");
    } catch (e) { 
      alert("حدث خطأ أثناء حفظ البيانات"); 
    }
  };

  // --- منطق الرسم (التوقيع) ---
  const startDrawing = (e: any) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    const ctx = canvas.getContext("2d");
    if(ctx) { ctx.beginPath(); ctx.moveTo(x, y); setIsDrawing(true); }
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    const ctx = canvas.getContext("2d");
    if(ctx) { ctx.lineTo(x, y); ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.stroke(); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-right font-sans pb-32" dir="rtl">
      {/* Header القسم العلوي */}
      <div className="bg-[#1E293B] text-white p-8 rounded-b-[50px] shadow-2xl mb-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
             <div>
                <h1 className="text-xl font-black italic">إدارة الغسيل 🧼</h1>
                <p className="text-[9px] text-blue-400 font-bold">المشرف الميداني: {adminName}</p>
             </div>
             <Link href="/admin/Laundry/completed_la" className="bg-blue-600 px-5 py-2 rounded-xl text-[10px] font-black shadow-lg active:scale-95 transition-all">الأرشيف 📁</Link>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <input 
              type="text" 
              placeholder="🔍 بحث باسم العميل..." 
              value={searchTerm} 
              onChange={(e)=>setSearchTerm(e.target.value)} 
              className="bg-white/10 p-4 rounded-2xl text-[10px] outline-none border border-white/5 focus:border-blue-500" 
            />
            <select 
              value={statusFilter} 
              onChange={(e)=>setStatusFilter(e.target.value)} 
              className="bg-white/10 p-4 rounded-2xl text-[10px] font-black text-blue-300 outline-none"
            >
                <option value="all">كل الحالات النشطة</option>
                <option value="pending">بإنتظار الاستلام</option>
                <option value="received">في المغسلة</option>
            </select>
          </div>
        </div>
      </div>

      {/* قائمة الطلبات */}
      <div className="px-6 max-w-4xl mx-auto space-y-5">
        {filteredOrders.length > 0 ? filteredOrders.map(order => (
          <div key={order.id} className="bg-white rounded-[40px] shadow-sm p-7 border border-gray-100 transition-all hover:shadow-md relative overflow-hidden">
            
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-50">
               <div className="flex flex-col gap-1">
                  <p className="text-[8px] font-black text-gray-400 uppercase">📅 طلب: {formatDateTime(order.createdAt)}</p>
                  <p className="text-[8px] font-black text-blue-500 uppercase">🚀 بدأت: {formatDateTime(order.receivedAt)}</p>
               </div>
               <div className={`px-4 py-1 rounded-full text-[8px] font-black ${order.status === 'pending' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                {order.status === 'pending' ? 'بإنتظار الاستلام' : 'قيد الغسيل'}
              </div>
            </div>

            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h4 className="font-black text-lg text-gray-800">{order.userName}</h4>
                  <a 
                    href={`https://wa.me/${order.contactPhone?.replace(/\s/g, '')}`} 
                    target="_blank" 
                    className="bg-green-500 text-white p-2 rounded-full text-xs shadow-sm hover:bg-green-600 transition-colors"
                  >
                    💬
                  </a>
                </div>
                <div className="flex gap-2 items-center mt-1">
                   <p className="text-[10px] text-blue-600 font-bold">{order.contactPhone}</p>
                   <span className="text-gray-300">|</span>
                   <p className="text-[9px] text-gray-400 font-black">#{order.orderNumber}</p>
                </div>
              </div>
            </div>

            {/* تفاصيل الخدمة والعنوان */}
            <div className="bg-gray-50 rounded-[30px] p-5 mb-6 grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <p className="text-[8px] font-black text-gray-400">نوع الخدمة</p>
                  <p className="text-[10px] font-black text-gray-700">
                    {order.serviceType === 'wash_iron' ? 'غسيل ومكواة 🧺' : order.serviceType === 'iron_only' ? 'مكواة فقط 💨' : 'غسيل فقط 💧'}
                  </p>
               </div>
               <div className="space-y-1">
                  <p className="text-[8px] font-black text-gray-400">الكمية | التكلفة</p>
                  <p className="text-[10px] font-black text-gray-700">{order.pieces} قطعة - {order.totalPrice} ج.س</p>
               </div>
               <div className="col-span-2 pt-2 border-t border-gray-200 flex justify-between items-center">
                  <div>
                    <p className="text-[8px] font-black text-gray-400">وصف العنوان</p>
                    <p className="text-[10px] font-bold text-gray-600 leading-relaxed">{order.addressDescription}</p>
                  </div>
                  {order.location && (
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${order.location.lat},${order.location.lng}`} 
                      target="_blank" 
                      className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 text-lg"
                    >📍</a>
                  )}
               </div>
            </div>

            {/* أزرار الإجراءات */}
            <div className="flex gap-2">
              {order.status === "pending" ? (
                <button 
                  onClick={() => updateDoc(doc(db, "laundry_orders", order.id), { status: "received", receivedAt: serverTimestamp() })}
                  className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black text-xs shadow-lg active:scale-95 transition-all"
                >
                  تأكيد الاستلام 📦
                </button>
              ) : (
                <button 
                  onClick={() => { setSelectedOrder(order); setShowDeliveryModal(true); }}
                  className="flex-1 bg-[#1E293B] text-white py-4 rounded-2xl font-black text-xs shadow-lg active:scale-95 transition-all"
                >
                  تسليم نهائي للعميل 🚚
                </button>
              )}
            </div>
          </div>
        )) : (
          <div className="text-center py-20 text-gray-400 font-black text-xs italic">لا توجد طلبات في هذه الفئة حالياً 🕊️</div>
        )}
      </div>

      {/* مودال الإنهاء والتوقيع والسائق */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[45px] p-8 space-y-6 shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <h3 className="text-xl font-black text-center text-gray-800 italic border-b pb-4 border-gray-100">تأكيد تسليم الطلب</h3>
            
            {/* اختيار السائق من ملف المركبات */}
            <div className="space-y-2">
               <label className="text-[10px] font-black text-gray-400 mr-2 uppercase tracking-widest">السائق الموصل</label>
               <select 
                 value={assignedDriver} 
                 onChange={(e)=>setAssignedDriver(e.target.value)}
                 className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-black outline-none border border-gray-100 focus:border-blue-200"
               >
                 <option value="">👤 حدد السائق المسؤول عن التوصيل</option>
                 {vehicles.map(v => <option key={v.id} value={v.driverName}>{v.driverName}</option>)}
               </select>
            </div>

            {/* لوحة التوقيع الرقمي */}
            <div className="space-y-2">
               <label className="text-[10px] font-black text-gray-400 mr-2 italic uppercase tracking-widest">توقيع العميل المستلم ✍️</label>
               <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[30px] overflow-hidden shadow-inner">
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
                    className="w-full h-48 cursor-crosshair touch-none bg-white" 
                  />
               </div>
               <p className="text-center text-[8px] text-gray-300 font-bold">يرجى من العميل الرسم داخل الصندوق أعلاه</p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
                <button 
                  onClick={finalizeDelivery} 
                  className="w-full bg-[#1E293B] text-white py-5 rounded-[25px] font-black text-sm shadow-xl active:scale-95 transition-all"
                >
                  إرسال للأرشيف المكتمل 💾
                </button>
                <button 
                  onClick={() => { setShowDeliveryModal(false); setAssignedDriver(""); }} 
                  className="w-full text-gray-300 text-[10px] font-black hover:text-red-400 transition-colors"
                >
                  إلغاء العملية
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
