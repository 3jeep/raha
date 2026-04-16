"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { 
  collection, query, where, onSnapshot, orderBy, getDocs 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { showToast, handleDelete, formatSDG } from "@/lib/utils";

function CountdownTimer({ startTime, totalHours }: { startTime: any, totalHours: number }) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!startTime) return;
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
        setTimeLeft(`${h} س و ${m} د متبقية`);
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
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null); 
  const [visitHistory, setVisitHistory] = useState<any[]>([]);
  
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

    let bData: any[] = [];
    let cData: any[] = [];
    let lData: any[] = [];

    const combineAndSort = () => {
      const combined = [...bData, ...cData, ...lData].sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });
      setAllOrders(combined);
      setLoading(false);
    };

    const qB = query(collection(db, "bookings"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
    const qC = query(collection(db, "contracts"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
    // تم التأكد من المسمى laundry_orders ليتطابق مع صفحة تأكيد الطلب
    const qL = query(collection(db, "laundry_orders"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));

    const unsubB = onSnapshot(qB, (snap) => {
      bData = snap.docs.map(d => ({ id: d.id, ...d.data(), source: 'booking' }));
      combineAndSort();
    }, (err) => { console.error("Error B:", err); combineAndSort(); });

    const unsubC = onSnapshot(qC, (snap) => {
      cData = snap.docs.map(d => ({ id: d.id, ...d.data(), source: 'contract' }));
      combineAndSort();
    }, (err) => { console.error("Error C:", err); combineAndSort(); });

    const unsubL = onSnapshot(qL, (snap) => {
      lData = snap.docs.map(d => ({ id: d.id, ...d.data(), source: 'laundry' }));
      combineAndSort();
    }, (err) => { console.error("Error L:", err); combineAndSort(); });

    return () => { unsubB(); unsubC(); unsubL(); };
  }, [currentUser]);

  const filteredOrders = allOrders.filter(o => {
    const isDone = ["completed", "completed_for_today", "contract_finished", "delivered"].includes(o.status);
    if (filter === "all") return true;
    if (filter === "completed") return isDone;
    if (filter === "active") return !isDone && o.status !== "cancelled";
    return true;
  });

  if (loading) return <div className="h-screen flex items-center justify-center font-black opacity-30 italic">جاري جلب بياناتك الرقمية...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 text-right font-sans" dir="rtl">
      
      <div className="bg-[#1E293B] p-8 rounded-b-[50px] shadow-2xl text-white mb-8 border-b-4 border-blue-600">
        <h1 className="text-2xl font-black italic">سجل طلباتي</h1>
        <p className="text-blue-400 text-[10px] font-bold mt-1 uppercase tracking-widest italic">Raha Dashboard</p>
      </div>

      <div className="flex gap-2 px-5 mb-6 overflow-x-auto no-scrollbar">
        {[{ id: "all", label: "الكل" }, { id: "active", label: "قيد التنفيذ" }, { id: "completed", label: "مكتملة" }].map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`px-6 py-2.5 rounded-2xl text-[11px] font-black shrink-0 transition-all ${filter === f.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100'}`}>{f.label}</button>
        ))}
      </div>

      <div className="px-5 space-y-6">
        {filteredOrders.length === 0 ? (
           <div className="text-center py-20 opacity-20 font-black italic">لا توجد طلبات لعرضها حالياً</div>
        ) : filteredOrders.map((order) => {
          const isMonthly = order.source === 'contract';
          const isLaundry = order.source === 'laundry';
          const isFullDone = ["completed", "contract_finished", "delivered"].includes(order.status);

          return (
            <div key={order.id} className={`bg-white rounded-[45px] p-8 shadow-sm border relative overflow-hidden transition-all ${isMonthly ? 'border-blue-100' : isLaundry ? 'border-emerald-100' : 'border-gray-50'}`}>
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-black text-gray-900 text-xl leading-none italic">
                    {isLaundry ? `🧺 طلب غسيل #${order.orderNumber || order.id.slice(0,5)}` : (order.packageName || (isMonthly ? "عقد راحة الشهري" : "زيارة مفردة ✨"))}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className={`px-4 py-1 rounded-full text-[9px] font-black border ${isFullDone ? 'bg-green-100 text-green-700' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                      {isFullDone ? 'مكتمل ✅' : 'قيد المعالجة ⚡'}
                    </span>
                    {isLaundry && <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black italic border border-emerald-100">{order.pieces || 0} قطعة</span>}
                  </div>
                </div>
                <p className="text-[12px] font-black text-[#1E293B] bg-gray-50 px-4 py-2 rounded-2xl" dir="ltr">
                  {formatSDG(order.totalPrice || order.price || 0)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6 bg-[#1E293B]/5 p-5 rounded-[30px] border border-gray-100 text-center">
                <div className="border-l border-gray-200">
                  <p className="text-[8px] text-gray-400 font-black mb-1 uppercase">{isLaundry ? "🚚 السائق" : "👩‍💼 الموظفة"}</p>
                  <p className="text-[10px] font-black text-gray-800">{isLaundry ? (order.deliveredByDriver || "جاري التنسيق") : (order.assignedMaid || "قيد التعيين")}</p>
                </div>
                <div>
                  <p className="text-[8px] text-gray-400 font-black mb-1 uppercase">🛠️ الخدمة</p>
                  <p className="text-[10px] font-black text-gray-800">
                    {isLaundry ? (
                      order.serviceType === "wash_iron" ? "غسيل ومكواة" : 
                      order.serviceType === "iron_only" ? "مكواة فقط" : "غسيل فقط"
                    ) : (order.packageName || "تنظيف منزلي")}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-3xl text-[10px] font-bold text-gray-600 italic border border-gray-100 text-center">
                📍 العنوان: {order.address || order.locationText || order.addressDescription || "العنوان المسجل"}
              </div>

              {isFullDone && (order.signature || order.customerSignature) && (
                <div className="mt-4 p-4 bg-white rounded-3xl border border-gray-50 text-center shadow-inner">
                  <p className="text-[7px] text-gray-300 font-black mb-1 uppercase italic">توقيع الاستلام</p>
                  <img src={order.signature || order.customerSignature} className="h-10 mx-auto mix-blend-multiply opacity-40 grayscale" alt="Sign" />
                </div>
              )}

              <div className="flex justify-between items-center px-2 pt-6 mt-4 border-t border-gray-50">
                <p className="text-[9px] text-gray-300 font-black italic uppercase">ID: {order.id.slice(0,8)}</p>
                <button onClick={() => window.open(`https://wa.me/249912429406`)} className="bg-[#1E293B] text-white px-5 py-3 rounded-2xl font-black text-[10px] shadow-lg flex items-center gap-2">الدعم 💬</button>
              </div>
            </div>
          );
        })}
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
