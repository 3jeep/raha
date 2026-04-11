"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { 
  collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc, serverTimestamp 
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
      
      if (h > 0) {
        setTimeLeft(`${h} ساعة و ${m} دقيقة`);
      } else {
        setTimeLeft(`${m} دقيقة و ${s} ثانية`);
      }
      
      if (diff <= 0) {
        setTimeLeft("انتهى الوقت");
        clearInterval(timer);
      }
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [hasInProgress, setHasInProgress] = useState(false);
  const [showCompletedBadge, setShowCompletedBadge] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

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
        const activeOrders = combined.filter(o => ["pending", "received", "in-progress"].includes(o.status));
        const inProgress = activeOrders.some(o => o.status === "in-progress");
        const completedCount = combined.filter(o => o.status === "completed").length;

        setActiveOrdersCount(activeOrders.length);
        setHasInProgress(inProgress);

        if (completedCount > 0 && activeOrders.length === 0) {
            setShowCompletedBadge(true);
            const timer = setTimeout(() => setShowCompletedBadge(false), 8000);
            return () => clearTimeout(timer);
        }
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

  const handleDeleteOrder = async (id: string, cat: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب نهائياً؟")) return;
    try {
      await deleteDoc(doc(db, cat === 'laundry' ? 'laundry_orders' : 'bookings', id));
      alert("تم حذف الطلب بنجاح");
    } catch (e) { alert("خطأ في الحذف"); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black opacity-20 italic">جاري جلب بياناتك...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 text-right" dir="rtl">
      <div className="bg-[#1E293B] text-white pt-12 pb-10 px-8 rounded-b-[45px] shadow-xl mb-6">
        <h1 className="text-xl font-black italic tracking-tighter">سجل طلباتي</h1>
        <p className="text-[9px] opacity-50 font-black uppercase mt-1 tracking-widest">Raha Services Hub</p>
      </div>

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
            
            <div className="flex flex-col gap-3 mb-5">
              <div className="flex justify-between items-center">
                <span className={`text-[8px] font-black px-3 py-1.5 rounded-xl uppercase ${order.categoryType === 'laundry' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {order.categoryType === 'laundry' ? '🧺 غسيل ملابس' : '🏠 خدمة نظافة'}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className={`w-full py-4 rounded-2xl text-center text-[11px] font-black transition-all ${order.status === 'completed' ? 'bg-green-50 text-green-600' : order.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-blue-600 text-white animate-pulse shadow-md shadow-blue-200'}`}>
                  {order.status === 'pending' ? 'انتظار الموافقة' : order.status === 'received' ? 'تم استلام الملابس' : order.status === 'in-progress' ? 'قيد العمل الآن ⚡' : order.status === 'completed' ? 'مكتمل ✅' : 'ملغي'}
                </div>
              </div>
            </div>

            <h3 className="font-black text-md text-slate-800 mb-4 italic">
              {order.categoryType === 'laundry' ? `طلب غسيل #${order.orderNumber}` : order.packageName}
            </h3>

            {/* العداد الذكي المعدل بناءً على طلبك */}
            {order.categoryType === 'cleaning' && 
             order.status === 'in-progress' && 
             order.ActualStartedAt && 
             order.category !== 'monthly' && ( // لا يظهر التوقيت إذا كانت الباقة متعددة (monthly)
              <div className="bg-blue-50/50 p-4 rounded-[25px] border border-blue-100 text-center mb-4 animate-in fade-in">
                <p className="text-[8px] font-black text-blue-400 uppercase mb-1 italic">الوقت المتبقي لانتهاء الزيارة</p>
                <div className="text-[12px] font-black">
                  <CountdownTimer targetTime={(order.ActualStartedAt.seconds * 1000) + (Number(order.totalHours || 4) * 3600 * 1000)} />
                </div>
              </div>
            )}

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

            {/* Employee Details */}
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

            {(order.ActualStartedAt || order.ActualFinishedAt) && (
              <div className="bg-slate-50/30 p-4 rounded-[30px] space-y-2 mb-4">
                {order.ActualStartedAt && (
                  <div className="flex justify-between text-[9px] font-bold text-slate-500">
                    <span>بدء العمل:</span>
                    <span className="text-slate-800" dir="ltr">{formatTimeOnly(order.ActualStartedAt)}</span>
                  </div>
                )}
                {order.ActualFinishedAt && (
                  <div className="flex justify-between text-[9px] font-bold text-slate-500">
                    <span>انتهاء العمل:</span>
                    <span className="text-slate-800" dir="ltr">{formatTimeOnly(order.ActualFinishedAt)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              {order.status === 'completed' && !order.isRated ? (
                <div className="text-center">
                  <StarRating onRate={(s) => handleRating(order.id, order.categoryType, s)} />
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => window.open(`https://wa.me/249912429406`)} className="flex-1 bg-[#1E293B] text-white py-4 rounded-2xl text-[9px] font-black">الدعم 💬</button>
                  {order.status === 'pending' && (
                    <button onClick={() => handleDeleteOrder(order.id, order.categoryType)} className="flex-1 bg-red-50 text-red-500 py-4 rounded-2xl text-[9px] font-black border border-red-100">حذف الطلب</button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-[#1E293B]/95 backdrop-blur-md h-16 rounded-[25px] flex items-center justify-around px-6 z-50 border border-white/10">
        {[
          { n: "العروض", i: "🏠", p: "/" }, 
          { n: "طلباتي", i: "📋", p: "/my-chekout" }, 
          { n: "حسابي", i: "👤", p: "/profile" }
        ].map((item) => {
          const badgeColor = hasInProgress ? 'bg-yellow-400' : showCompletedBadge ? 'bg-green-500' : 'bg-red-500';
          const badgeText = showCompletedBadge ? "✓" : activeOrdersCount;
          return (
            <Link key={item.p} href={item.p} className={`flex flex-col items-center relative transition-all ${pathname === item.p ? 'opacity-100 scale-110' : 'opacity-40'}`}>
              {item.p === "/my-chekout" && (activeOrdersCount > 0 || showCompletedBadge) && (
                <span className={`absolute -top-1 -right-1 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg border border-[#1E293B] animate-pulse ${badgeColor}`}>
                  {badgeText}
                </span>
              )}
              <span className="text-xl">{item.i}</span>
              <span className="text-[8px] font-black text-white mt-1">{item.n}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
