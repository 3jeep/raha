"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { 
  collection, query, where, onSnapshot, orderBy, doc, updateDoc, serverTimestamp 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

// --- مكون العداد التنازلي للزيارات المفردة ---
function CountdownTimer({ targetTime }: { targetTime: number }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((targetTime - now) / 1000));
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setTimeLeft(`${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      if (diff <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [targetTime]);

  return <span className="tabular-nums font-black text-blue-600">{timeLeft}</span>;
}

// --- مكون النجوم للتقييم ---
function StarRating({ onRate }: { onRate: (stars: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-2 justify-center mt-4 p-4 bg-blue-50/50 rounded-[25px] border border-dashed border-blue-100 animate-in zoom-in">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)} onClick={() => onRate(star)} className="text-2xl transition-all active:scale-150">
          {star <= (hover || 0) ? "⭐" : "☆"}
        </button>
      ))}
    </div>
  );
}

export default function MyCheckoutPage() {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [supportWhatsapp, setSupportWhatsapp] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  // تنسيق الوقت والتاريخ
  const formatDate = (val: any) => {
    if (!val) return "---";
    const date = val.seconds ? new Date(val.seconds * 1000) : new Date(val);
    return date.toLocaleString("ar-EG", { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
  };

  const formatTimeOnly = (val: any) => {
    if (!val) return "";
    const date = val.seconds ? new Date(val.seconds * 1000) : new Date(val);
    return date.toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' });
  };

  // دالة حساب المدة المستغرقة بين البدء والانتهاء
  const calculateExecutionTime = (start: any, end: any) => {
    if (!start || !end) return null;
    const startTime = start.seconds ? start.seconds * 1000 : new Date(start).getTime();
    const endTime = end.seconds ? end.seconds * 1000 : new Date(end).getTime();
    const diffInMs = endTime - startTime;
    
    const hours = Math.floor(diffInMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return hours > 0 ? `${hours} ساعة و ${minutes} دقيقة` : `${minutes} دقيقة`;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setCurrentUser(user);
      else router.push("/login");
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;
    const qCleaning = query(collection(db, "bookings"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
    const qLaundry = query(collection(db, "laundry_orders"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));

    const unsubCleaning = onSnapshot(qCleaning, (snap1) => {
      const cleaning = snap1.docs.map(d => ({ id: d.id, categoryType: 'cleaning', ...d.data() }));
      const unsubLaundry = onSnapshot(qLaundry, (snap2) => {
        const laundry = snap2.docs.map(d => ({ id: d.id, categoryType: 'laundry', ...d.data() }));
        const combined = [...cleaning, ...laundry].sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setAllOrders(combined);
        setLoading(false);
      });
    });
    return () => unsubCleaning();
  }, [currentUser]);

  const handleRating = async (id: string, cat: string, stars: number) => {
    try {
      await updateDoc(doc(db, cat === 'laundry' ? 'laundry_orders' : 'bookings', id), { rating: stars, isRated: true });
      alert("شكراً لتقييمك! 🌟");
    } catch (e) { alert("فشل التقييم"); }
  };

  const handleCancelOrder = async (id: string, cat: string) => {
    if (!confirm("إلغاء الطلب؟")) return;
    try {
      await updateDoc(doc(db, cat === 'laundry' ? 'laundry_orders' : 'bookings', id), { status: "cancelled" });
    } catch (e) { alert("خطأ في الإلغاء"); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black opacity-20 italic">جاري جلب بياناتك...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 text-right" dir="rtl">
      {/* Header */}
      <div className="bg-[#1E293B] text-white pt-12 pb-10 px-8 rounded-b-[45px] shadow-xl mb-6">
        <h1 className="text-xl font-black italic tracking-tighter">سجل طلباتي</h1>
        <p className="text-[9px] opacity-50 font-black uppercase mt-1 tracking-widest">Raha Services Hub</p>
      </div>

      {/* Tabs Filter */}
      <div className="flex gap-2 px-4 mb-6 overflow-x-auto no-scrollbar">
        {[{ id: "all", label: "الكل" }, { id: "pending", label: "النشطة والانتظار" }, { id: "completed", label: "المكتملة" }].map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black shrink-0 transition-all ${filter === f.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-400 border border-slate-100'}`}>{f.label}</button>
        ))}
      </div>

      <div className="px-4 space-y-5">
        {allOrders.filter(o => {
          if (filter === "all") return true;
          if (filter === "pending") return ["pending", "received", "in-progress"].includes(o.status);
          return o.status === filter;
        }).map(order => (
          <div key={order.id} className="bg-white rounded-[40px] p-7 shadow-sm border border-slate-50 relative overflow-hidden">
            
            {/* Status & Category */}
            <div className="flex justify-between items-center mb-5">
              <span className={`text-[8px] font-black px-3 py-1.5 rounded-xl uppercase ${order.categoryType === 'laundry' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                {order.categoryType === 'laundry' ? '🧺 غسيل ملابس' : '🏠 خدمة نظافة'}
              </span>
              <span className={`text-[8px] font-black px-3 py-1.5 rounded-xl ${order.status === 'completed' ? 'bg-green-50 text-green-600' : order.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-blue-600 text-white animate-pulse'}`}>
                {order.status === 'pending' ? 'انتظار الموافقة' : order.status === 'received' ? 'تم استلام الملابس' : order.status === 'in-progress' ? 'قيد العمل الآن ⚡' : order.status === 'completed' ? 'مكتمل ✅' : 'ملغي'}
              </span>
            </div>

            {/* Service Details */}
            <h3 className="font-black text-md text-slate-800 mb-4 italic">
              {order.categoryType === 'laundry' ? `طلب غسيل #${order.orderNumber}` : order.packageName}
            </h3>

            {/* Time & Price Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-50/50 p-4 rounded-[25px] border border-slate-100">
                <p className="text-[7px] font-black text-slate-400 uppercase mb-1">بتاريخ</p>
                <p className="text-[10px] font-black text-slate-700">{formatDate(order.createdAt)}</p>
              </div>
              <div className="bg-slate-50/50 p-4 rounded-[25px] border border-slate-100">
                <p className="text-[7px] font-black text-slate-400 uppercase mb-1">المبلغ</p>
                <p className="text-[10px] font-black text-blue-600">{order.totalPrice || order.price} ج.س</p>
              </div>
            </div>

            {/* Employee Details (New) */}
            {order.status === 'completed' && (
              <div className="bg-blue-50/30 p-4 rounded-[25px] border border-blue-50 mb-4">
                 <p className="text-[7px] font-black text-blue-400 uppercase mb-2">معلومات الكادر</p>
                 <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-600">
                       {order.categoryType === 'laundry' ? '🚚 السائق المسؤول:' : '👤 العاملة المسؤولة:'}
                    </span>
                    <span className="text-[10px] font-black text-slate-800">
                       {order.categoryType === 'laundry' ? (order.deliveredByDriver || 'يوسف') : (order.assignedMaid || '---')}
                    </span>
                 </div>
              </div>
            )}

            {/* Timer for Single Visits */}
            {order.categoryType === 'cleaning' && order.category === 'single' && order.status === 'in-progress' && order.targetEndTime && (
              <div className="bg-blue-50 p-5 rounded-[30px] border border-blue-100 text-center mb-4">
                <p className="text-[8px] font-black text-blue-400 uppercase mb-1">الوقت المتبقي للانتهاء</p>
                <p className="text-xl"><CountdownTimer targetTime={order.targetEndTime} /></p>
              </div>
            )}

            {/* Actual Duration & Times (New Logic) */}
            {(order.actualStartedAt || order.ActualFinishedAt) && (
              <div className="bg-slate-50/30 p-4 rounded-[30px] space-y-2 mb-4">
                {order.actualStartedAt && (
                  <div className="flex justify-between text-[9px] font-bold text-slate-500">
                    <span>بدء العمل:</span>
                    <span className="text-slate-800" dir="ltr">{formatTimeOnly(order.actualStartedAt)}</span>
                  </div>
                )}
                {order.ActualFinishedAt && (
                  <div className="flex justify-between text-[9px] font-bold text-slate-500">
                    <span>انتهاء العمل:</span>
                    <span className="text-slate-800" dir="ltr">{formatTimeOnly(order.ActualFinishedAt)}</span>
                  </div>
                )}
                {order.status === 'completed' && order.actualStartedAt && order.ActualFinishedAt && (
                   <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between items-center">
                      <span className="text-[9px] font-black text-blue-600">إجمالي مدة التنفيذ:</span>
                      <span className="text-[10px] font-black text-blue-700">
                        {calculateExecutionTime(order.actualStartedAt, order.ActualFinishedAt)}
                      </span>
                   </div>
                )}
              </div>
            )}

            {/* Signature Gallery */}
            {(order.signature || order.customerSignature) && order.status === 'completed' && (
              <div className="mb-4 border-t border-dashed border-slate-100 pt-4 text-center">
                <p className="text-[7px] font-black text-slate-300 uppercase mb-2">توقيع الاستلام</p>
                <img src={order.signature || order.customerSignature} className="h-16 mx-auto object-contain mix-blend-multiply opacity-80" alt="توقيع" />
              </div>
            )}

            {/* Actions & Rating */}
            <div className="pt-4 border-t border-slate-100">
              {order.status === 'completed' && !order.isRated ? (
                <div className="text-center">
                  <p className="text-[9px] font-black text-blue-600 italic mb-2">
                    {order.categoryType === 'laundry' ? `تقييم السائق (${order.deliveredByDriver || 'يوسف'})` : `تقييم العاملة (${order.assignedMaid || '---'})`}
                  </p>
                  <StarRating onRate={(s) => handleRating(order.id, order.categoryType, s)} />
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => window.open(`https://wa.me/249912429406`)} className="flex-1 bg-[#1E293B] text-white py-4 rounded-2xl text-[9px] font-black">الدعم 💬</button>
                  {order.status === 'pending' && (
                    <button onClick={() => handleCancelOrder(order.id, order.categoryType)} className="flex-1 bg-red-50 text-red-500 py-4 rounded-2xl text-[9px] font-black border border-red-100">إلغاء</button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-[#1E293B]/95 backdrop-blur-md h-16 rounded-[25px] flex items-center justify-around px-6 z-50 border border-white/10">
        {[{ n: "العروض", i: "🏠", p: "/" }, { n: "طلباتي", i: "📋", p: "/my-chekout" }, { n: "حسابي", i: "👤", p: "/profile" }].map((item) => (
          <Link key={item.p} href={item.p} className={`flex flex-col items-center transition-all ${pathname === item.p ? 'opacity-100 scale-110' : 'opacity-40'}`}>
            <span className="text-xl">{item.i}</span>
            <span className="text-[8px] font-black text-white mt-1">{item.n}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
