"use client";
import { useEffect, useState, Suspense } from "react";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDocs, 
  writeBatch, 
  where 
} from "firebase/firestore";
import { Bell, Clock, ChevronLeft, Trash2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { showToast } from "@/lib/utils";

// --- شريط التنقل السفلي الموحد ---
const BottomNav = () => {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => setCurrentUser(user || null));
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const qNoti = query(
      collection(db, "users", currentUser.uid, "notifications"), 
      where("isRead", "==", false)
    );
    return onSnapshot(qNoti, (snap) => setUnreadCount(snap.size));
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
    <div className="fixed bottom-0 left-0 right-0 w-full bg-[#1E293B] h-16 shadow-2xl flex items-center justify-around px-2 z-50 border-t-2 border-[#1E293B] rounded-t-[25px]">
      {navItems.map((item) => (
        <Link key={item.path} href={item.path} className={`flex flex-col items-center relative transition-all ${pathname === item.path ? 'scale-110 opacity-100' : 'opacity-50'}`}>
          {item.path === "/notifications" && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg border border-[#1E293B] animate-bounce">
              {unreadCount}
            </span>
          )}
          <span className="text-xl">{item.icon}</span>
          <span className="text-[8px] font-black text-white mt-1 uppercase">{item.name}</span>
        </Link>
      ))}
    </div>
  );
};

export default function NotificationsPage() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    return onAuthStateChanged(auth, (curr) => { 
      setUser(curr); 
      setLoading(false); 
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "notifications"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  const markRead = async (id: string) => { 
    try { 
      await updateDoc(doc(db, "users", user.uid, "notifications", id), { isRead: true }); 
    } catch(e) { console.error(e); } 
  };

  const clearAllNotifications = async () => {
    if (!user || notifications.length === 0) return;
    if (!confirm("⚠️ هل أنت متأكد من حذف جميع الإشعارات؟")) return;

    try {
      const q = collection(db, "users", user.uid, "notifications");
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      showToast("تم مسح سجل الإشعارات بنجاح ✨");
    } catch (error) {
      showToast("حدث خطأ أثناء الحذف", "error");
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen font-black italic">جاري التحميل...</div>;

  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="bg-gray-100 p-6 rounded-[40px] mb-4 text-4xl">👤</div>
      <h2 className="text-xl font-black text-gray-800 mb-6">يجب تسجيل الدخول لمشاهدة الإشعارات</h2>
      <button onClick={() => router.push("/login")} className="bg-[#1E293B] text-white px-8 py-3 rounded-full font-black">تسجيل الدخول</button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6 min-h-screen bg-gray-50 pb-32" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-100"><Bell size={24} /></div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 leading-none">الإشعارات</h1>
            <p className="text-[9px] font-black text-blue-600 uppercase mt-1">تحديثات طلباتك من راحة</p>
          </div>
        </div>
        <div className="flex gap-2">
          {notifications.length > 0 && (
            <button onClick={clearAllNotifications} className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center border border-red-100 transition-all active:scale-90">
              <Trash2 size={18} className="text-red-500" />
            </button>
          )}
          <button onClick={() => router.back()} className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200"> <ChevronLeft className="text-gray-600" /> </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[40px] border border-gray-100 text-gray-400 font-bold italic">لا توجد إشعارات حالياً 📭</div>
      ) : (
        <div className="space-y-4">
          {notifications.map((n: any) => (
            <div 
              key={n.id} 
              onClick={() => !n.isRead && markRead(n.id)} 
              className={`p-5 rounded-[35px] border transition-all duration-300 relative overflow-hidden ${n.isRead ? 'bg-white border-gray-100 opacity-70' : 'bg-white border-blue-200 shadow-xl shadow-blue-50'}`}
            >
              {!n.isRead && <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-600"></div>}
              <h3 className={`font-black mb-1 ${n.isRead ? 'text-gray-600' : 'text-blue-900'}`}>{n.title}</h3>
              <p className="text-gray-500 text-sm font-medium mb-3">{n.body}</p>
              <div className="text-[10px] text-gray-400 flex items-center gap-1 font-black italic uppercase tracking-tighter">
                <Clock size={12} className="text-blue-500" /> 
                {n.createdAt?.toDate().toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
