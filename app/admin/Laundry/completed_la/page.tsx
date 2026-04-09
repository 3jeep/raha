"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, onSnapshot, query, orderBy, where 
} from "firebase/firestore";
import Link from "next/link";

export default function CompletedLaundryPage() {
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");

  useEffect(() => {
    // جلب الطلبات التي حالتها مكتملة فقط وترتيبها من الأحدث
    const q = query(
      collection(db, "laundry_orders"), 
      where("status", "==", "completed"),
      orderBy("actualDeliveredAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setCompletedOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // منطق التصفية (بحث بالاسم/الرقم + فلترة بالتاريخ)
  const filtered = completedOrders.filter(o => {
    const matchSearch = o.userName?.toLowerCase().includes(searchTerm.toLowerCase()) || o.orderNumber?.toString().includes(searchTerm);
    const matchDate = filterDate ? o.actualDeliveredAt?.toDate().toISOString().split('T')[0] === filterDate : true;
    return matchSearch && matchDate;
  });

  // حساب إجمالي الدخل للطلبات المعروضة
  const totalRevenue = filtered.reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0);

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-right font-sans pb-20" dir="rtl">
      {/* Header - الهيدر الداكن */}
      <div className="bg-[#0F172A] text-white p-8 rounded-b-[45px] shadow-lg mb-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <Link href="/admin/Laundry" className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-white/20 transition-all">
              ← العودة للطلبات النشطة
            </Link>
            <h1 className="text-xl font-black italic">أرشيف المكتمل 📦</h1>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <input 
              type="text" 
              placeholder="🔍 بحث باسم العميل..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/10 p-3 rounded-2xl text-[10px] outline-none border border-white/5 focus:border-blue-500"
            />
            <input 
              type="date" 
              value={filterDate} 
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-white/10 p-3 rounded-2xl text-[10px] outline-none border border-white/5"
            />
          </div>
        </div>
      </div>

      {/* ملخص الإحصائيات (الفوترة) */}
      <div className="px-6 max-w-4xl mx-auto mb-6 flex gap-4">
        <div className="bg-white p-5 rounded-[30px] flex-1 shadow-sm border border-gray-100 text-center">
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">إجمالي الطلبات</p>
          <p className="text-xl font-black text-blue-900">{filtered.length}</p>
        </div>
        <div className="bg-white p-5 rounded-[30px] flex-1 shadow-sm border border-gray-100 text-center">
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">صافي الإيرادات</p>
          <p className="text-xl font-black text-green-600">
            {totalRevenue.toLocaleString()} <span className="text-[8px]">ج.س</span>
          </p>
        </div>
      </div>

      {/* قائمة الطلبات المكتملة */}
      <div className="px-6 max-w-4xl mx-auto space-y-4">
        {filtered.length > 0 ? filtered.map((order) => (
          <div key={order.id} className="bg-white rounded-[35px] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-black text-gray-800 text-base">{order.userName}</h4>
                  <p className="text-[9px] text-gray-400 font-bold mt-1">طلب رقم #{order.orderNumber}</p>
                </div>
                <div className="text-left">
                   <div className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[8px] font-black border border-green-100">
                     تم التسليم بنجاح ✅
                   </div>
                   {order.rating && (
                     <p className="text-[8px] font-black text-blue-600 mt-2 italic">التقييم: {order.rating}</p>
                   )}
                </div>
              </div>

              {/* تفاصيل مالية ولوجستية */}
              <div className="grid grid-cols-3 gap-2 mb-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="text-center">
                  <p className="text-[7px] font-black text-gray-400 mb-1">القطع</p>
                  <p className="text-[10px] font-black text-gray-700">{order.pieces}</p>
                </div>
                <div className="text-center border-x border-gray-200">
                  <p className="text-[7px] font-black text-gray-400 mb-1">المبلغ المحصل</p>
                  <p className="text-[10px] font-black text-green-700">{order.totalPrice} ج.س</p>
                </div>
                <div className="text-center">
                  <p className="text-[7px] font-black text-gray-400 mb-1">السائق الموصل</p>
                  <p className="text-[10px] font-black text-blue-600">{order.deliveredByDriver || "غير محدد"}</p>
                </div>
              </div>

              {/* تذييل البطاقة */}
              <div className="flex justify-between items-center text-[8px] font-bold text-gray-400 mt-2 px-1">
                <p>تاريخ التسليم: {order.actualDeliveredAt?.toDate().toLocaleString()}</p>
                <p>بإشراف: {order.finalizedByAdmin}</p>
              </div>
            </div>

            {/* عرض توقيع العميل */}
            {order.customerSignature && (
              <div className="bg-gray-50/50 p-4 border-t border-gray-50 flex items-center justify-between">
                <span className="text-[8px] font-black text-gray-400 italic">توقيع المستلم:</span>
                <img 
                  src={order.customerSignature} 
                  alt="توقيع العميل" 
                  className="h-12 opacity-70 grayscale contrast-125 hover:opacity-100 transition-all" 
                />
              </div>
            )}
          </div>
        )) : (
          <div className="text-center py-20">
            <p className="text-gray-400 font-black text-xs italic">لا توجد سجلات مكتملة تطابق بحثك 🕊️</p>
          </div>
        )}
      </div>
    </div>
  );
}
