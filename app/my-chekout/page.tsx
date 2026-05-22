"use client";
import { useState, useEffect, Suspense, lazy } from "react";
import { db, auth } from "@/lib/firebase";
import { 
  collection, query, where, onSnapshot, orderBy, getDocs, doc, updateDoc, serverTimestamp 
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
// استيراد getFCMToken لربط الإشعارات
import { showToast, handleDelete, formatSDG, getFCMToken } from "@/lib/utils";

// --- 1. تعريف شريط التنقل السفلي الموحد (مثل الرئيسية والبروفايل) ---
const BottomNav = lazy(() => Promise.resolve({ default: () => {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => setCurrentUser(user || null));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const qNoti = query(
      collection(db, "notifications"), 
      where("userId", "==", currentUser.uid),
      where("isRead", "==", false)
    );
    const unsubNoti = onSnapshot(qNoti, (snap) => setUnreadNotificationsCount(snap.size));
    return () => unsubNoti();
  }, [currentUser]);

  if (!currentUser) return null;

  const navItems = [
    { name: "الرئيسية", icon: "🏠", path: "/" },
    { name: "طلباتي", icon: "📋", path: "/my-chekout" },
    { name: "الإشعارات", icon: "🔔", path: "/notifications" },
    { name: "العروض", icon: "🏷️", path: "/packages" },
    { name: "حسابي", icon: "👤", path: "/profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full bg-[#1E293B] h-16 shadow-2xl flex items-center justify-around px-2 z-50 border-t-2 border-r-2 border-l-2 border-[#1E293B] rounded-t-[25px]">
      {navItems.map((item) => (
        <Link key={item.path} href={item.path} className={`flex flex-col items-center relative transition-all ${pathname === item.path ? 'scale-110 opacity-100' : 'opacity-50'}`}>
          {item.path === "/notifications" && unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg border border-[#1E293B] animate-bounce">
              {unreadNotificationsCount}
            </span>
          )}
          <span className="text-xl">{item.icon}</span>
          <span className="text-[8px] font-black text-white mt-1 uppercase">{item.name}</span>
        </Link>
      ))}
    </div>
  );
}}));

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
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime, totalHours]);
  return <span className="text-white font-black text-xl font-mono tracking-widest">{timeLeft}</span>;
}

export default function MyCheckoutPage() {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const token = await getFCMToken();
          if (token) {
            await updateDoc(doc(db, "users", user.uid), {
              fcmToken: token,
              lastSeenAt: serverTimestamp()
            } as any);
          }
        } catch (e) {
          console.log("FCM update skipped");
        }
      } else {
        router.push("/login");
      }
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

  const handleCancelOrder = async (orderId: string, collectionName: string) => {
    if (confirm("هل أنت متأكد من رغبتك في إلغاء الطلب؟")) {
      try {
        const targetColl = collectionName === 'booking' ? 'bookings' : collectionName === 'contract' ? 'contracts' : 'laundry_orders';
        await updateDoc(doc(db, targetColl, orderId), {
          status: "cancelled",
          cancelledAt: new Date()
        });
        showToast("جاري معالجة طلبك في الإلغاء ⏳");
      } catch (error) {
        showToast("حدث خطأ أثناء الإلغاء", "error");
      }
    }
  };

  const formatSimpleDate = (timestamp: any) => {
    if (!timestamp) return "غير محدد";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const formatFinishDate = (timestamp: any) => {
    if (!timestamp) return null;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const filteredOrders = allOrders.filter(o => {
    const isDone = ["completed", "completed_for_today", "contract_finished", "delivered"].includes(o.status);
    if (filter === "all") return true;
    if (filter === "completed") return isDone;
    if (filter === "active") return !isDone && o.status !== "cancelled";
    return true;
  });

  if (loading) return <div className="h-screen flex items-center justify-center font-black opacity-30 italic">جاري جلب بياناتك الرقمية...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-40 text-right font-sans" dir="rtl">
      
      <div className="bg-[#1E293B] p-8 rounded-b-[50px] shadow-2xl text-white mb-8 border-b-4 border-blue-600 relative overflow-hidden">
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
          const isMonthly = order.source === 'contract' || order.category === 'monthly_contract';
          const isLaundry = order.source === 'laundry';
          const isFullDone = ["completed", "contract_finished", "delivered", "completed_for_today"].includes(order.status);
          const isCancelled = order.status === "cancelled";

          return (
            <div key={order.id} className={`bg-white rounded-[45px] p-8 shadow-sm border relative overflow-hidden transition-all ${isMonthly ? 'border-blue-100' : isLaundry ? 'border-emerald-100' : 'border-gray-50'}`}>
              
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  {!isMonthly && (
                    <p className="text-[8px] font-black text-gray-400 mb-1">تاريخ الطلب: {formatSimpleDate(order.createdAt)}</p>
                  )}
                  {isMonthly && order.contractStartDate && (
                    <p className="text-[8px] font-black text-blue-500 mb-1">تاريخ بدء العقد: {formatSimpleDate(order.contractStartDate)}</p>
                  )}
                  
                  <h3 className="font-black text-gray-900 text-xl leading-none italic">
                    {isLaundry ? `🧺 طلب غسيل #${order.orderNumber || order.id.slice(0,5)}` : (order.packageName || (isMonthly ? "عقد راحة الشهري 🗓️" : "زيارة مفردة ✨"))}
                  </h3>
                  
                  {isMonthly && (
                    <p className="text-[10px] font-black text-blue-600 mt-2 bg-blue-50 w-fit px-3 py-1 rounded-lg border border-blue-100">رقم العقد: {order.contractNumber || order.id.slice(0, 8).toUpperCase()}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className={`px-4 py-1 rounded-full text-[9px] font-black border ${isCancelled ? 'bg-red-50 text-red-600 border-red-100' : isFullDone ? 'bg-green-100 text-green-700' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                      {isCancelled ? 'ملغي ❌' : isFullDone ? 'مكتمل ✅' : 'قيد المعالجة ⚡'}
                    </span>
                    {!isLaundry && (
                       <span className={`px-3 py-1 rounded-full text-[8px] font-black ${isMonthly ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                          {isMonthly ? 'عقد شهري' : 'زيارة عابرة'}
                       </span>
                    )}
                  </div>
                </div>
                <p className="text-[12px] font-black text-[#1E293B] bg-gray-50 px-4 py-2 rounded-2xl shrink-0" dir="ltr">
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

              {order.status === "in-progress" && order.actualStartedAt && (
                <div className="mb-6 bg-[#1E293B] p-6 rounded-[35px] text-center shadow-xl border-t-4 border-blue-500 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-2 opacity-10 text-white text-4xl">⏱️</div>
                   <p className="text-[10px] font-black text-blue-300 mb-2 uppercase tracking-tighter">جاري العمل الآن | الوقت المتبقي</p>
                   <CountdownTimer startTime={order.actualStartedAt} totalHours={Number(order.totalHours || 5)} />
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-3xl text-[10px] font-bold text-gray-600 italic border border-gray-100 text-center">
                📍 العنوان: {order.address || order.locationText || order.addressDescription || "العنوان المسجل"}
              </div>

              {isFullDone && (
                <div className="mt-4 bg-green-50/50 p-3 rounded-2xl border border-green-100 text-center">
                  <p className="text-[9px] font-black text-green-700">🗓️ تم الإكمال في: {formatFinishDate(order.actualFinishedAt)}</p>
                </div>
              )}

              <div className="flex justify-between items-center px-2 pt-6 mt-4 border-t border-gray-50">
                <div className="flex gap-2">
                   <p className="text-[9px] text-gray-300 font-black italic uppercase">ID: {order.id.slice(0,8)}</p>
                   {!isFullDone && !isCancelled && order.status !== "in-progress" && (
                     <button 
                       onClick={() => handleCancelOrder(order.id, order.source)}
                       className="text-[9px] text-red-500 font-black uppercase underline mr-2"
                     >
                       إلغاء الطلب ❌
                     </button>
                   )}
                </div>
                <button onClick={() => window.open(`https://wa.me/249912429406`)} className="bg-[#1E293B] text-white px-5 py-3 rounded-2xl font-black text-[10px] shadow-lg flex items-center gap-2">الدعم 💬</button>
              </div>
            </div>
          );
        })}
      </div>

      <Suspense fallback={null}><BottomNav /></Suspense>
    </div>
  );
}
