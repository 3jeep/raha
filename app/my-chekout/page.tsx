"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { 
  collection, query, where, onSnapshot, orderBy 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { showToast, handleDelete, formatSDG } from "@/lib/utils";

// --- مكون العداد التنازلي الحي ---
function CountdownTimer({ startTime, totalHours }: { startTime: any, totalHours: number }) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const timer = setInterval(() => {
      const startMs = startTime.seconds * 1000;
      const endMs = startMs + (totalHours * 60 * 60 * 1000);
      const now = Date.now();
      const diff = endMs - now;
      if (diff <= 0) {
        setTimeLeft("انتهى وقت الخدمة");
        clearInterval(timer);
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${h} ساعة و ${m} دقيقة متبقية`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime, totalHours]);
  return <span className="text-blue-700 font-black italic">{timeLeft}</span>;
}

export default function MyCheckoutPage() {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setCurrentUser(user);
      else router.push("/login");
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "bookings"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllOrders(docs);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [currentUser]);

  if (loading) return <div className="h-screen flex items-center justify-center font-black opacity-30 italic">جاري تحميل سجل طلباتك...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 text-right font-sans" dir="rtl">
      
      <div className="bg-[#1E293B] p-8 rounded-b-[50px] shadow-2xl text-white mb-8 border-b-4 border-blue-600">
        <h1 className="text-2xl font-black italic tracking-tight">سجل طلباتي</h1>
        <p className="text-blue-400 text-[10px] font-bold mt-1 uppercase tracking-widest">Raha Digital Archive</p>
      </div>

      <div className="flex gap-2 px-5 mb-6 overflow-x-auto no-scrollbar">
        {[{ id: "all", label: "الكل" }, { id: "pending", label: "نشطة" }, { id: "completed", label: "مكتملة" }].map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`px-6 py-2.5 rounded-2xl text-[11px] font-black shrink-0 transition-all ${filter === f.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100'}`}>{f.label}</button>
        ))}
      </div>

      <div className="px-5 space-y-6">
        {allOrders.filter(o => filter === "all" ? true : filter === "completed" ? o.status === "completed" : o.status !== "completed").map((order) => (
          <div key={order.id} className="bg-white rounded-[45px] p-8 shadow-sm border border-gray-50 relative overflow-hidden group">
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-black text-gray-900 text-xl leading-none italic">{order.packageName || "باقة متنوعة"}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className={`px-4 py-1 rounded-full text-[9px] font-black border shadow-sm ${order.status === 'completed' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                    {order.status === 'completed' ? 'مكتمل بنجاح ✅' : 'قيد المعالجة ⚡'}
                  </span>
                  <span className="bg-gray-50 text-gray-500 px-3 py-1 rounded-full text-[9px] font-black border border-gray-100 italic">
                    {order.category === 'monthly' ? 'باقة شهرية' : 'زيارة مفردة'}
                  </span>
                </div>
              </div>
              <p className="text-[12px] font-black text-[#1E293B] bg-gray-50 px-4 py-2 rounded-2xl" dir="ltr">{formatSDG(order.totalPrice || order.price)}</p>
            </div>

            {order.status === 'in-progress' && order.actualStartedAt && order.category !== 'monthly' && (
              <div className="bg-blue-600/5 border border-blue-600/10 p-5 rounded-[30px] text-center mb-6 animate-pulse">
                <p className="text-[9px] font-black text-gray-400 mb-1 uppercase italic">الزمن المتبقي للخدمة</p>
                <div className="text-[13px]">
                  <CountdownTimer startTime={order.actualStartedAt} totalHours={order.totalHours || 4} />
                </div>
              </div>
            )}

            {order.status === 'completed' && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gray-50/80 p-4 rounded-[25px] border border-gray-100 text-center">
                  <p className="text-[8px] text-gray-400 font-black mb-1 uppercase italic">بدأت</p>
                  <p className="text-[11px] font-black text-gray-700">{order.actualStartedAt?.toDate().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="bg-gray-50/80 p-4 rounded-[25px] border border-gray-100 text-center">
                  <p className="text-[8px] text-gray-400 font-black mb-1 uppercase italic">انتهت</p>
                  <p className="text-[11px] font-black text-gray-700">{order.actualFinishedAt?.toDate().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-6 bg-[#1E293B]/5 p-5 rounded-[30px] border border-gray-100">
              <div className="text-center border-l border-gray-200">
                <p className="text-[8px] text-gray-400 font-black mb-1 uppercase">👩‍💼 الكادر النسائي</p>
                <p className="text-[10px] font-black text-gray-800">{order.assignedMaid || "قيد التعيين"}</p>
              </div>
              <div className="text-center">
                <p className="text-[8px] text-gray-400 font-black mb-1 uppercase">🚐 كابتن التوصيل</p>
                <p className="text-[10px] font-black text-gray-800">{order.assignedVehicle || order.AssignedVehicle || "---"}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-3xl text-[11px] font-bold text-gray-600 italic border border-gray-100">
                📍 الموقع: {order.locationText || order.address}
              </div>
              {order.status === 'completed' && order.signature && (
                <div className="p-4 bg-white rounded-[30px] border border-gray-50 text-center shadow-inner relative">
                  <p className="text-[8px] text-gray-300 font-black mb-2 uppercase italic tracking-widest">التوقيع الرقمي المعتمد</p>
                  <img src={order.signature} className="h-14 mx-auto mix-blend-multiply opacity-50 grayscale" alt="Sign" />
                </div>
              )}
            </div>

            <div className="flex justify-between items-center px-2 pt-6 mt-4 border-t border-gray-50">
              <p className="text-[9px] text-gray-300 font-black italic tracking-tighter">ID: {order.id.slice(0,8).toUpperCase()}</p>
              <div className="flex gap-2">
                {order.status === 'pending' && (
                  <button onClick={() => handleDelete("bookings", order.id)} className="bg-red-50 text-red-500 px-5 py-3 rounded-2xl font-black text-[10px] border border-red-100 shadow-sm">إلغاء 🗑️</button>
                )}
                <button onClick={() => window.open(`https://wa.me/249912429406`)} className="bg-[#1E293B] text-white px-5 py-3 rounded-2xl font-black text-[10px] shadow-lg flex items-center gap-2">الدعم 💬</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-[#1E293B]/95 backdrop-blur-md h-16 rounded-[25px] flex items-center justify-around px-6 z-50 border border-white/10">
        {[
          { n: "الرئيسية", i: "🏠", p: "/" }, 
          { n: "طلباتي", i: "📋", p: "/my-chekout" }, 
          { n: "حسابي", i: "👤", p: "/profile" }
        ].map((item) => (
          <Link key={item.p} href={item.p} className={`flex flex-col items-center transition-all ${pathname === item.p ? 'opacity-100 scale-110' : 'opacity-40'}`}>
            <span className="text-xl">{item.i}</span>
            <span className="text-[8px] font-black text-white mt-1">{item.n}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
