 "use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

// استدعاء الخريطة من نفس المجلد مع تعطيل SSR لمنع خطأ window is not defined
const MapComponent = dynamic(() => import("./MapComponent"), { 
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 animate-pulse flex items-center justify-center rounded-[35px] font-black text-[10px] text-gray-400">جاري تحميل الخريطة...</div>
});

// مكون التنقل السفلي
function BottomNav() {
  const pathname = usePathname();
  const navItems = [
    { name: "العروض", icon: "🏠", path: "/" },
    { name: "طلباتي", icon: "📋", path: "/my-chekout" },
    { name: "حسابي", icon: "👤", path: "/profile" },
  ];
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-[#1E293B]/95 backdrop-blur-md h-16 rounded-[25px] shadow-2xl flex items-center justify-around px-6 z-50 border border-white/10">
      {navItems.map((item) => (
        <Link key={item.path} href={item.path} className={`flex flex-col items-center transition-all ${pathname === item.path ? 'scale-110 opacity-100' : 'opacity-40'}`}>
          <span className="text-xl">{item.icon}</span>
          <span className="text-[8px] font-black text-white mt-1">{item.name}</span>
        </Link>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([15.5007, 32.5599]); // الخرطوم
  
  const [profile, setProfile] = useState({
    fullName: "",
    phone: "",
    address: "",
    latitude: null as number | null,
    longitude: null as number | null
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setProfile({
              fullName: data.fullName || "",
              phone: data.phone || "",
              address: data.address || "",
              latitude: data.latitude || null,
              longitude: data.longitude || null
            });
            if (data.latitude) setMapCenter([data.latitude, data.longitude]);
          }
        } catch (err) { console.error("Error:", err); }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) return alert("المتصفح لا يدعم تحديد الموقع");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setProfile(prev => ({ ...prev, latitude, longitude }));
        setMapCenter([latitude, longitude]);
        alert("📍 تم تحديد موقعك التلقائي!");
      },
      () => {
        alert("⚠️ فشل التحديد التلقائي، الرجاء التحديد يدوياً من الخريطة");
        setShowMapModal(true);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        ...profile,
        email: user.email,
        updatedAt: new Date()
      }, { merge: true });
      alert("✅ تم الحفظ بنجاح");
    } catch (err) { alert("❌ فشل الحفظ"); } finally { setIsSaving(false); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black italic text-blue-900">جاري التحميل...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 text-right font-sans" dir="rtl">
      
      {/* هيدر البروفايل: الصورة والإيميل */}
      <div className="bg-[#2B4C7E] text-white pt-16 pb-28 px-8 rounded-b-[50px] shadow-xl text-center relative overflow-hidden">
        <div className="relative z-10">
          <img 
            src={user?.photoURL || `https://ui-avatars.com/api/?name=${profile.fullName || 'User'}&background=random`} 
            className="w-20 h-20 rounded-full border-4 border-white/20 mx-auto mb-3 shadow-lg object-cover" 
            alt="User"
          />
          <h1 className="text-xl font-black italic">{profile.fullName || "مستخدم جديد"}</h1>
          <p className="text-[9px] opacity-60 font-bold tracking-widest">{user?.email}</p>
        </div>
      </div>

      <div className="px-6 -mt-16 max-w-lg mx-auto space-y-5 relative z-10">
        
        {/* بطاقة الموقع الجغرافي */}
        <div className="bg-white p-6 rounded-[35px] shadow-xl shadow-blue-900/5 border border-gray-50 space-y-3">
           <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-blue-600 uppercase italic">الموقع الجغرافي 📍</span>
              <button 
                type="button" 
                onClick={handleGetLocation}
                className="bg-blue-600 text-white px-5 py-2 rounded-xl text-[9px] font-black shadow-md active:scale-95 transition-all"
              >
                تحديد موقعي
              </button>
           </div>
           {profile.latitude ? (
             <div className="flex justify-between items-center text-[9px] font-bold text-green-600 bg-green-50 p-3 rounded-2xl">
               <span>الموقع مربوط بنجاح ✅</span>
               <button type="button" onClick={() => setShowMapModal(true)} className="underline">تعديل يدوي</button>
             </div>
           ) : (
             <p className="text-[9px] text-gray-400 italic">يساعدنا موقعك الجغرافي في توصيل طلباتك بدقة وسرعة</p>
           )}
        </div>

        {/* نموذج البيانات */}
        <form onSubmit={handleUpdateProfile} className="bg-white p-8 rounded-[40px] shadow-xl shadow-blue-900/5 space-y-4 border border-gray-100">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 mr-2">الاسم الكامل</label>
            <input required value={profile.fullName} onChange={e => setProfile({...profile, fullName: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 text-xs font-black outline-none border-none focus:ring-2 ring-blue-100" />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 mr-2">رقم الهاتف</label>
            <input required value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 text-xs font-black outline-none text-left" dir="ltr" />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 mr-2">العنوان الوصفي</label>
            <textarea value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} placeholder="المنطقة، الشارع، المعالم..." className="w-full p-4 rounded-2xl bg-gray-50 text-xs font-black outline-none h-20 resize-none border-none focus:ring-2 ring-blue-100" />
          </div>

          <button type="submit" disabled={isSaving} className="w-full py-5 rounded-[30px] font-black text-xs shadow-xl bg-[#2B4C7E] text-white active:scale-95 transition-all">
            {isSaving ? "جاري الحفظ..." : "حفظ التغييرات ✨"}
          </button>
        </form>

        <button onClick={() => auth.signOut()} className="w-full py-4 rounded-[30px] bg-red-50 text-red-500 font-black text-[10px] border border-red-100 mb-10">تسجيل الخروج 🚪</button>
      </div>

      {/* نافذة الخريطة المنبثقة */}
      {showMapModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center">
          <div className="bg-white w-full max-w-xl rounded-t-[40px] p-6 h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-6">
               <h3 className="font-black text-sm italic">حدد موقعك على الخريطة 🗺️</h3>
               <button onClick={() => setShowMapModal(false)} className="text-gray-400 font-bold px-2">إغلاق</button>
            </div>
            <div className="flex-1 rounded-[35px] overflow-hidden border-2 border-gray-50 shadow-inner">
                <MapComponent 
                   mapCenter={mapCenter} 
                   setProfile={setProfile} 
                   profile={profile} 
                />
            </div>
            <button 
              onClick={() => setShowMapModal(false)}
              className="w-full mt-6 py-5 bg-[#2B4C7E] text-white rounded-3xl font-black text-xs shadow-lg"
            >
              تثبيت الموقع المختار ✅
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}