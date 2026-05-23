"use client";
import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit, startAfter, where, Timestamp, deleteDoc, doc, getCountFromServer } from "firebase/firestore";
import { Loader2, Trash2, Edit, ChevronLeft, ChevronRight, UserPlus, Globe, Shield, ShoppingBag } from "lucide-react";

export default function UsersManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, today: 0, google: 0 });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageHistory, setPageHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchUsers(null);
  }, [searchTerm, startDate, endDate]);

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const allUsersSnap = await getDocs(collection(db, "users"));
      const allData = allUsersSnap.docs.map(d => d.data());
      const todaySnap = await getCountFromServer(query(collection(db, "users"), where("createdAt", ">=", Timestamp.fromDate(today))));
      
      setStats({
        total: allData.length,
        today: todaySnap.data().count,
        google: allData.filter(u => u.provider === "google").length
      });
    } catch (error) { console.error("Error fetching stats:", error); }
  };

  const fetchUsers = async (direction: 'next' | 'prev' | null = null) => {
    setLoading(true);
    let q = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(10));

    if (searchTerm) {
      q = query(collection(db, "users"), where("phone", "==", searchTerm));
    } else if (startDate && endDate) {
      q = query(collection(db, "users"), where("createdAt", ">=", Timestamp.fromDate(new Date(startDate))), where("createdAt", "<=", Timestamp.fromDate(new Date(endDate))));
    }

    if (direction === 'next' && pageHistory.length > 0) {
      q = query(q, startAfter(pageHistory[pageHistory.length - 1]), limit(10));
    }

    const snapshot = await getDocs(q);
    
    // جلب عدد الطلبات لكل مستخدم من (bookings) و (contracts)
    const data = await Promise.all(snapshot.docs.map(async (userDoc) => {
      const userData = userDoc.data();
      
      // جلب الطلبات المفردة
      const bookingsQ = query(collection(db, "bookings"), where("userId", "==", userDoc.id));
      const bookingsSnap = await getDocs(bookingsQ);
      
      // جلب العقود الشهرية
      const contractsQ = query(collection(db, "contracts"), where("userId", "==", userDoc.id));
      const contractsSnap = await getDocs(contractsQ);
      
      let completed = 0, pending = 0;
      
      // حساب الطلبات المفردة
      bookingsSnap.forEach(b => {
        const status = b.data().status;
        if (status === "completed") completed++;
        else pending++;
      });

      // حساب العقود
      contractsSnap.forEach(c => {
        const data = c.data();
        // نعتبر العقد مكتملاً إذا كانت الزيارات مكتملة أو بناءً على حالته
        if (data.status === "completed" || data.status === "completed_for_today") completed++;
        else pending++;
      });
      
      return { id: userDoc.id, ...userData, completedOrders: completed, pendingOrders: pending };
    }));
    
    setUsers(data);
    if (snapshot.docs.length > 0 && direction !== 'prev') {
      setPageHistory(prev => [...prev, snapshot.docs[snapshot.docs.length - 1]]);
    }
    setLoading(false);
  };

  const deleteUser = async (id: string) => {
    if (confirm("هل أنت متأكد من الحذف؟")) {
      await deleteDoc(doc(db, "users", id));
      fetchUsers(null);
      fetchStats();
    }
  };

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen" dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-4">
          <div className="p-3 bg-indigo-100 rounded-xl"><UserPlus className="text-indigo-600"/></div>
          <div><p className="text-[10px] text-slate-400 font-bold">الإجمالي</p><h2 className="text-lg font-black">{stats.total}</h2></div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-xl"><UserPlus className="text-blue-600"/></div>
          <div><p className="text-[10px] text-slate-400 font-bold">جديد اليوم</p><h2 className="text-lg font-black">{stats.today}</h2></div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-4">
          <div className="p-3 bg-red-100 rounded-xl"><Globe className="text-red-600"/></div>
          <div><p className="text-[10px] text-slate-400 font-bold">مستخدمي جوجل</p><h2 className="text-lg font-black">{stats.google}</h2></div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-bold text-slate-400">بحث بالهاتف</label>
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full border rounded-xl p-2 mt-1 text-sm outline-none" placeholder="09xxxx..." />
        </div>
        <input type="date" className="border rounded-xl p-2 mt-1 text-sm" onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" className="border rounded-xl p-2 mt-1 text-sm" onChange={(e) => setEndDate(e.target.value)} />
      </div>

      <div className="space-y-4">
        {loading ? <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto"/></div> : 
         users.map((user) => (
            <div key={user.id} className="bg-white p-4 rounded-2xl shadow-sm border flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-sm">{user.fullName || "مستخدم غير مسمى"}</h3>
                  <p className="text-xs text-slate-500 font-bold">{user.email || "لا يوجد إيميل"}</p>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 text-blue-500"><Edit size={16}/></button>
                  <button onClick={() => deleteUser(user.id)} className="p-2 text-red-500"><Trash2 size={16}/></button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 border-t pt-2">
                <p>الهاتف: <span className="text-slate-700 font-bold">{user.phone}</span></p>
                <p>تاريخ الانضمام: <span className="text-slate-700 font-bold">{user.createdAt?.toDate().toLocaleDateString() || "غير متوفر"}</span></p>
                <p className="flex items-center gap-1">
                    <ShoppingBag size={12}/> مكتملة: <span className="text-emerald-600 font-black">{user.completedOrders}</span>
                </p>
                <p className="flex items-center gap-1">
                    <ShoppingBag size={12}/> معلقة: <span className="text-amber-600 font-black">{user.pendingOrders}</span>
                </p>
                <p className="flex items-center gap-1 col-span-2 mt-1 border-t pt-1">
                    <Shield size={12} className="text-amber-500"/> الصلاحية: 
                    <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold uppercase">
                        {user.adminType || "User"}
                    </span>
                </p>
              </div>
            </div>
          ))}
      </div>

      <div className="flex justify-center gap-4 mt-8 pb-10">
        <button onClick={() => { setCurrentPage(p => Math.max(0, p - 1)); fetchUsers('prev'); }} disabled={currentPage === 0} className="p-3 bg-white shadow rounded-xl"><ChevronRight/></button>
        <span className="self-center font-black text-sm">صفحة {currentPage + 1}</span>
        <button onClick={() => { setCurrentPage(p => p + 1); fetchUsers('next'); }} disabled={users.length < 10} className="p-3 bg-white shadow rounded-xl"><ChevronLeft/></button>
      </div>
    </div>
  );
}
