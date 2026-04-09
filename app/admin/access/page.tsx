"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function AccessPage() {
  const [email, setEmail] = useState("");
  const [foundUser, setFoundUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isSuper, setIsSuper] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // حماية إضافية داخل الصفحة: التأكد أن المستخدم الحالي هو Super Admin
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().adminType === "super") {
          setIsSuper(true);
        }
      }
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setFoundUser(null);

    try {
      const q = query(collection(db, "users"), where("email", "==", email.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        setFoundUser({ id: userDoc.id, ...userDoc.data() });
      } else {
        alert("لم يتم العثور على مستخدم بهذا البريد الإلكتروني ❌");
      }
    } catch (error) {
      alert("حدث خطأ أثناء البحث");
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = async (type: "super" | "laundry" | "cleaning" | "user") => {
    if (!foundUser) return;
    setActionLoading(true);

    try {
      const userRef = doc(db, "users", foundUser.id);
      await updateDoc(userRef, {
        role: type === "user" ? "user" : "admin",
        adminType: type === "user" ? null : type
      });
      alert("تم تحديث الصلاحيات بنجاح ✅");
      setFoundUser(null);
      setEmail("");
    } catch (error) {
      alert("فشل تحديث الصلاحيات");
    } finally {
      setActionLoading(false);
    }
  };

  if (checkingAuth) return <div className="p-10 text-center font-black animate-bounce text-blue-600">جاري التحقق...</div>;

  if (!isSuper) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center bg-red-50 rounded-[40px] border-2 border-dashed border-red-200">
        <span className="text-5xl mb-4">🚫</span>
        <h2 className="text-xl font-black text-red-600 italic">دخول غير مصرح!</h2>
        <p className="text-sm text-red-400 font-bold mt-2">هذه الصفحة مخصصة للمدير العام فقط.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* هيدر الصفحة بتصميم متناسق مع الداشبورد */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-800 italic flex items-center gap-3">
          <span className="bg-amber-100 p-2 rounded-xl text-lg">🔑</span>
          إدارة صلاحيات الوصول
        </h1>
        <p className="text-[11px] text-slate-400 font-black mr-12 uppercase tracking-tighter">نظام منح وإلغاء صلاحيات الموظفين</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* عمود البحث */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-[30px] border border-slate-100 shadow-sm">
            <label className="block text-[10px] font-black text-slate-400 mb-3 uppercase mr-2">ابحث بالإيميل</label>
            <form onSubmit={handleSearch} className="space-y-3">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com" 
                className="w-full p-4 rounded-2xl bg-slate-50 border-none text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              <button 
                disabled={loading}
                className="w-full bg-[#1E293B] text-white p-4 rounded-2xl font-black text-[10px] hover:bg-blue-600 transition-all shadow-lg shadow-blue-900/10 disabled:opacity-50"
              >
                {loading ? "جاري البحث..." : "بحث عن المستخدم"}
              </button>
            </form>
          </div>
        </div>

        {/* عمود النتائج والتحكم */}
        <div className="lg:col-span-2">
          {foundUser ? (
            <div className="bg-white p-8 rounded-[35px] shadow-xl border border-blue-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-5 mb-8 pb-6 border-b border-slate-50">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner">👤</div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 italic">{foundUser.fullName || "مستخدم مجهول"}</h3>
                  <p className="text-[10px] text-blue-500 font-black">{foundUser.email}</p>
                </div>
                <div className="mr-auto text-left">
                    <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-[9px] font-black text-slate-500 uppercase italic">
                       الحالة: {foundUser.adminType || foundUser.role}
                    </span>
                </div>
              </div>

              <h4 className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-widest text-center">تعيين دور وظيفي جديد</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AdminOption label="مدير عام (Super)" color="bg-amber-500" onClick={() => updatePermission("super")} disabled={actionLoading} />
                <AdminOption label="مشرف غسيل (Laundry)" color="bg-indigo-600" onClick={() => updatePermission("laundry")} disabled={actionLoading} />
                <AdminOption label="مشرف نظافة (Cleaning)" color="bg-sky-600" onClick={() => updatePermission("cleaning")} disabled={actionLoading} />
                <AdminOption label="سحب الصلاحية" color="bg-red-500" onClick={() => updatePermission("user")} disabled={actionLoading} isDelete />
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center border-4 border-dashed border-slate-100 rounded-[40px]">
              <div className="text-4xl grayscale opacity-20">🔎</div>
              <p className="text-[11px] font-black text-slate-300 mt-4 italic uppercase">لم يتم تحديد مستخدم بعد</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminOption({ label, color, onClick, disabled, isDelete }: any) {
  return (
    <button 
      disabled={disabled}
      onClick={onClick}
      className={`p-4 rounded-2xl text-white font-black text-[10px] italic transition-all active:scale-95 shadow-lg shadow-gray-100 hover:brightness-110 ${color} ${isDelete ? 'sm:col-span-2 mt-4' : ''}`}
    >
      {label}
    </button>
  );
}
