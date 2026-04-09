"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [adminData, setAdminData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        const data = userDoc.data();

        if (userDoc.exists() && data?.role === "admin") {
          setAdminData(data);
        } else {
          alert("عذراً، هذا القسم مخصص للموظفين فقط 🛑");
          router.push("/");
        }
      } catch (error) {
        console.error("Auth Error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleAdminLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      alert("فشل تسجيل الدخول");
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white font-black italic animate-pulse text-blue-900">
        جاري فحص صلاحيات الوصول...
      </div>
    );
  }

  if (!adminData) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#F8FAFC] p-6">
        <div className="bg-white p-10 rounded-[45px] shadow-2xl text-center border border-slate-100 max-w-sm w-full">
          <div className="text-4xl mb-4">🔐</div>
          <h1 className="text-xl font-black text-slate-800 mb-6 italic">لوحة تحكم الإدارة</h1>
          <button 
            onClick={handleAdminLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 px-6 py-4 rounded-2xl font-black text-xs hover:bg-slate-50 transition-all shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5" alt="Google" />
            تسجيل الدخول كـ موظف
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row" dir="rtl">
      
      {/* القائمة الجانبية (Sidebar) */}
      <aside className="w-full md:w-72 bg-[#1E293B] p-6 text-white shrink-0 shadow-2xl z-50">
        <div className="mb-10 px-2 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black italic shadow-lg shadow-blue-500/20">R</div>
          <div>
            <h2 className="text-lg font-black italic text-white tracking-tighter">لوحة التحكم</h2>
            <p className="text-[8px] text-blue-400 font-bold uppercase">{adminData.adminType} Account</p>
          </div>
        </div>
        
        <nav className="space-y-1">
          
          {/* 📊 العرض العام */}
          <div className="py-2">
            <p className="text-[9px] text-slate-500 font-black mb-3 mr-3 uppercase tracking-widest">العرض العام</p>
            <NavLink href="/admin" active={pathname === "/admin"} label="الإحصائيات العامة" icon="📊" />
          </div>

          {/* 🏠 قسم النظافة */}
          {(adminData.adminType === "super" || adminData.adminType === "cleaning") && (
            <div className="py-2 border-t border-slate-800/50 mt-2">
              <p className="text-[9px] text-slate-500 font-black mb-3 mr-3 uppercase tracking-widest">خدمات النظافة</p>
              <NavLink href="/admin/orders" active={pathname === "/admin/orders"} label="الطلبات الحالية" icon="🏠" />
              <NavLink href="/admin/completed" active={pathname === "/admin/completed"} label="أرشيف الزيارات" icon="✅" />
            </div>
          )}

          {/* 🧺 قسم الغسيل */}
          {(adminData.adminType === "super" || adminData.adminType === "laundry") && (
            <div className="py-2 border-t border-slate-800/50 mt-2">
              <p className="text-[9px] text-slate-500 font-black mb-3 mr-3 uppercase tracking-widest">غسيل الملابس</p>
              <NavLink href="/admin/Laundry" active={pathname === "/admin/Laundry"} label="طلبات الدليفري" icon="🧺" />
              <NavLink href="/admin/Laundry/completed_la" active={pathname === "/admin/Laundry/completed_la"} label="أرشيف الغسيل" icon="📋" />
            </div>
          )}

          {/* 🔐 إدارة النظام (للمدير العام فقط) */}
          {adminData.adminType === "super" && (
            <div className="py-2 border-t border-slate-800/50 mt-2">
              <p className="text-[9px] text-amber-500 font-black mb-3 mr-3 uppercase tracking-widest">إدارة النظام</p>
              <NavLink href="/admin/access" active={pathname === "/admin/access"} label="منح الصلاحيات" icon="🔐" />
            </div>
          )}

          <div className="pt-10">
            <button 
              onClick={() => auth.signOut()} 
              className="w-full p-4 rounded-2xl bg-red-500/10 text-red-400 font-black text-[10px] text-right hover:bg-red-500 hover:text-white transition-all flex items-center gap-3"
            >
              <span>🚪</span> تسجيل الخروج
            </button>
          </div>
        </nav>
      </aside>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}

// مكون NavLink المعرف داخلياً لمنع خطأ ReferenceError
function NavLink({ href, active, label, icon }: { href: string; active: boolean; label: string; icon: string }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 mb-1 ${
        active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-x-[-4px]' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-[11px] font-black italic">{label}</span>
      {active && <span className="mr-auto w-1.5 h-1.5 bg-white rounded-full"></span>}
    </Link>
  );
}
