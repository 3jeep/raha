"use client";
import { useState } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, getDocs, deleteDoc, doc, query, where, writeBatch, or 
} from "firebase/firestore";
import { showToast } from "@/lib/utils";

export default function SuperAdminClearPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [foundUser, setFoundUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // دالة المسح الجماعي
  const clearCollection = async (collectionName: string, statusFilter?: { field: string, value: any }) => {
    const confirmAction = confirm(`⚠️ هل أنت متأكد تماماً من حذف بيانات ${collectionName}؟ لا يمكن التراجع!`);
    if (!confirmAction) return;

    setLoading(true);
    try {
      let q = query(collection(db, collectionName));
      if (statusFilter) {
        q = query(collection(db, collectionName), where(statusFilter.field, "==", statusFilter.value));
      }

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      
      showToast(`تم مسح ${snapshot.size} سجل من ${collectionName} بنجاح ✨`);
    } catch (error) {
      console.error(error);
      showToast("حدث خطأ أثناء عملية المسح", "error");
    }
    setLoading(false);
  };

  // حذف المستخدمين (user أو فارغ) باستثناء الإداريين
  const clearAllNormalUsers = async () => {
    const confirmAction = confirm("⚠️ سيتم حذف جميع الحسابات العادية (user) والحسابات غير المصنفة. هل أنت متأكد؟");
    if (!confirmAction) return;

    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const batch = writeBatch(db);
      let count = 0;

      snapshot.docs.forEach((d) => {
        const data = d.data();
        // الحذف إذا كان user أو إذا كانت القيم فارغة تماماً (ليست admin)
        const isNormalUser = data.role === "user" || !data.role;
        const isNotAdmin = data.adminType !== "super" && data.adminType !== "laundry" && data.adminType !== "cleaning";

        if (isNormalUser && isNotAdmin) {
          batch.delete(d.ref);
          count++;
        }
      });

      await batch.commit();
      showToast(`تم حذف ${count} مستخدم بنجاح ✨`);
    } catch (error) {
      showToast("خطأ في حذف المستخدمين", "error");
    }
    setLoading(false);
  };

  const searchUser = async () => {
    if (!searchQuery) return;
    setLoading(true);
    try {
      const q = query(collection(db, "users"), or(where("email", "==", searchQuery), where("phone", "==", searchQuery)));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setFoundUser({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setFoundUser(null);
        showToast("المستخدم غير موجود", "error");
      }
    } catch (e) {
      showToast("خطأ في البحث", "error");
    }
    setLoading(false);
  };

  const deleteFoundUser = async () => {
    if (!foundUser) return;
    if (confirm(`حذف المستخدم ${foundUser.fullName || foundUser.userName} نهائياً؟`)) {
      await deleteDoc(doc(db, "users", foundUser.id));
      setFoundUser(null);
      setSearchQuery("");
      showToast("تم حذف المستخدم بنجاح");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-right font-sans pb-20" dir="rtl">
      <div className="bg-[#0F172A] text-white p-10 rounded-b-[50px] shadow-2xl mb-8">
        <h1 className="text-2xl font-black italic text-center">الإدارة العليا - تنظيف البيانات ⚙️</h1>
        <p className="text-center text-red-400 text-[10px] mt-2 font-black uppercase tracking-widest">تحذير: هذه العمليات نهائية</p>
      </div>

      <div className="max-w-4xl mx-auto px-6 space-y-8">
        
        {/* قسم البحث */}
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
          <h3 className="font-black text-gray-800 mb-4 border-r-4 border-blue-600 pr-3 italic">البحث عن مستخدم وحذفه</h3>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="الإيميل أو رقم الهاتف..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-gray-50 p-4 rounded-2xl text-xs font-black outline-none border border-transparent focus:border-blue-500 transition-all"
            />
            <button onClick={searchUser} className="bg-blue-600 text-white px-6 rounded-2xl font-black text-xs active:scale-95 transition-all">بحث 🔍</button>
          </div>
          {foundUser && (
            <div className="mt-6 p-4 bg-red-50 rounded-3xl border border-red-100 flex justify-between items-center animate-in zoom-in-95">
              <div>
                <p className="font-black text-gray-800 text-sm">{foundUser.fullName || foundUser.userName}</p>
                <p className="text-[10px] text-gray-500">{foundUser.email} | {foundUser.phone}</p>
              </div>
              <button onClick={deleteFoundUser} className="bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg">حذف نهائي 🔥</button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* قسم العقود */}
          <div className="bg-white p-6 rounded-[35px] shadow-sm space-y-3 border border-gray-100 border-r-8 border-r-blue-600">
            <h4 className="font-black text-xs text-blue-900 mb-2 italic">إدارة العقود (Contracts)</h4>
            <button onClick={() => clearCollection("contracts")} className="w-full py-4 bg-blue-50 text-blue-600 rounded-2xl text-[10px] font-black hover:bg-blue-100 transition-all">حذف كولكشن العقود بالكامل 📑</button>
            <button onClick={() => clearCollection("contracts", { field: "status", value: "completed" })} className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl text-[10px] font-black hover:bg-gray-100 transition-all">حذف العقود المكتملة فقط 📁</button>
          </div>

          {/* قسم الزيارات */}
          <div className="bg-white p-6 rounded-[35px] shadow-sm space-y-3 border border-gray-100 border-r-8 border-r-orange-500">
            <h4 className="font-black text-xs text-orange-900 mb-2 italic">الزيارات المفردة (Bookings)</h4>
            <button onClick={() => clearCollection("bookings", { field: "status", value: "pending" })} className="w-full py-4 bg-orange-50 text-orange-600 rounded-2xl text-[10px] font-black hover:bg-orange-100 transition-all">حذف الزيارات النشطة 🕒</button>
            <button onClick={() => clearCollection("bookings", { field: "status", value: "completed" })} className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl text-[10px] font-black hover:bg-gray-100 transition-all">حذف الزيارات المكتملة ✅</button>
          </div>

          {/* قسم الغسيل */}
          <div className="bg-white p-6 rounded-[35px] shadow-sm space-y-3 border border-gray-100 border-r-8 border-r-purple-600">
            <h4 className="font-black text-xs text-purple-900 mb-2 italic">قسم الغسيل (Laundry)</h4>
            <button onClick={() => clearCollection("laundry_orders", { field: "status", value: "pending" })} className="w-full py-4 bg-purple-50 text-purple-600 rounded-2xl text-[10px] font-black">حذف طلبات الغسيل النشطة 🧼</button>
            <button onClick={() => clearCollection("laundry_orders", { field: "status", value: "completed" })} className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl text-[10px] font-black">حذف أرشيف الغسيل 📦</button>
          </div>

          {/* قسم المستخدمين */}
          <div className="bg-white p-6 rounded-[35px] shadow-sm space-y-3 border border-gray-100 border-r-8 border-r-red-600">
            <h4 className="font-black text-xs text-red-900 mb-2 italic">المستخدمين (Users)</h4>
            <button onClick={clearAllNormalUsers} className="w-full py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black shadow-lg hover:bg-red-700 transition-all">حذف كل الـ Users وغير المصنفين 👥</button>
            <p className="text-[7px] text-gray-400 text-center font-bold">يستثني هذا الزر أي مستخدم لديه رتبة Super أو Laundry أو Cleaning</p>
          </div>

        </div>

        {loading && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[200]">
            <div className="bg-white p-8 rounded-[40px] shadow-2xl flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-black text-xs text-gray-700 italic">جاري تنظيف قاعدة البيانات...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
