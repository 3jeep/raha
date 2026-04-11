"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

// استدعاء الخريطة مع تعطيل SSR
const MapComponent = dynamic(() => import("./MapComponent"), { 
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 animate-pulse flex items-center justify-center rounded-[35px] font-black text-[10px] text-gray-500">جاري تحميل الخريطة...</div>
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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-[#1E293B] h-16 rounded-[25px] shadow-2xl flex items-center justify-around px-6 z-50 border border-white/20">
      {navItems.map((item) => (
        <Link key={item.path} href={item.path} className={`flex flex-col items-center transition-all ${pathname === item.path ? 'scale-110 opacity-100' : 'opacity-50'}`}>
          <span className="text-xl">{item.icon}</span>
          <span className="text-[9px] font-black text-white mt-1 uppercase tracking-tighter">{item.name}</span>
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
  const [mapCenter, setMapCenter] = useState<[number, number]>([15.5007, 32.5599]); // الخرطوم كمركز افتراضي
  
  const [profile, setProfile] = useState({
    fullName: "",
    phone: "",
    address: "",
    latitude: null as number | null,
    longitude: null as number | null
  });

  // دالة جلب الموقع التلقائي
  const handleGetLocation = (isAuto = false) => {
    if (!navigator.geolocation) {
      if (!isAuto) alert("المتصفح لا يدعم تحديد الموقع");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setProfile(prev => ({ ...prev, latitude, longitude }));
        setMapCenter([latitude, longitude]);
        if (!isAuto) alert("📍 تم تحديث موقعك بنجاح!");
      },
      () => {
        if (!isAuto) {
          alert("⚠️ تعذر جلب الموقع التلقائي، الرجاء التحديد يدوياً من الخريطة");
          setShowMapModal(true);
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

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
            const storedLat = data.latitude || null;
            const storedLng = data.longitude || null;

            setProfile({
              fullName: data.fullName || "",
              phone: data.phone || "",
              address: data.address || "",
              latitude: storedLat,
              longitude: storedLng
            });

            if (storedLat) setMapCenter([storedLat, storedLng]);
            handleGetLocation(true);
          }
        } catch (err) { console.error("Error:", err); }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);

    // --- تعديل رقم الهاتف ليتحول الصفر إلى 249 ---
    let formattedPhone = profile.phone.trim();
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "249" + formattedPhone.substring(1);
    }

    try {
      await setDoc(doc(db, "users", user.uid), {
        ...profile,
        phone: formattedPhone, // حفظ الرقم بالصيغة الدولية
        email: user.email,
        updatedAt: new Date()
      }, { merge: true });
      
      // تحديث الحالة المحلية لعرض الرقم الجديد
      setProfile(prev => ({ ...prev, phone: formattedPhone }));
      
      alert("✅ تم الحفظ بنجاح");
    } catch (err) { 
      alert("❌ فشل الحفظ"); 
    } finally { 
      setIsSaving(false); 
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black italic text-blue-900 text-lg">جاري التحميل...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 text-right font-sans" dir="rtl">
      
      <div className="bg-[#1E293B] text-white pt-16 pb-28 px-8 rounded-b-[50px] shadow-2xl text-center relative overflow-hidden">
        <div className="relative z-10">
          <img 
            src={user?.photoURL || `https://ui-avatars.com/api/?name=${profile.fullName || 'User'}&background=random`} 
            className="w-24 h-24 rounded-full border-4 border-white/30 mx-auto mb-4 shadow-xl object-cover" 
            alt="User"
          />
          <h1 className="text-2xl font-black italic tracking-tight">{profile.fullName || "مستخدم جديد"}</h1>
          <p className="text-[10px] opacity-90 font-black tracking-widest text-blue-300 mt-1 uppercase">{user?.email}</p>
        </div>
      </div>

      <div className="px-6 -mt-16 max-w-lg mx-auto space-y-5 relative z-10">
        
        <div className="bg-white p-6 rounded-[35px] shadow-xl border border-gray-100 space-y-3">
           <div className="flex justify-between items-center">
              <span className="text-[11px] font-black text-blue-700 uppercase italic">الموقع الجغرافي 📍</span>
              <button 
                type="button" 
                onClick={() => handleGetLocation(false)}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black shadow-lg active:scale-95 transition-all"
              >
                تحديث الموقع
              </button>
           </div>
           {profile.latitude ? (
             <div className="flex justify-between items-center text-[10px] font-black text-green-700 bg-green-50 p-4 rounded-2xl border border-green-100">
               <span>الموقع مربوط بنجاح ✅</span>
               <button type="button" onClick={() => setShowMapModal(true)} className="underline text-blue-600">تعديل يدوي</button>
             </div>
           ) : (
             <div className="flex justify-between items-center bg-orange-50 p-4 rounded-2xl border border-orange-100">
               <p className="text-[9px] text-orange-700 font-bold italic leading-relaxed">تعذر تحديد الموقع تلقائياً</p>
               <button type="button" onClick={() => setShowMapModal(true)} className="bg-orange-600 text-white px-3 py-1.5 rounded-xl text-[9px] font-black">تحديد يدوي</button>
             </div>
           )}
        </div>

        <form onSubmit={handleUpdateProfile} className="bg-white p-8 rounded-[40px] shadow-xl space-y-5 border border-gray-100">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-500 mr-2 block">الاسم الكامل</label>
            <input required value={profile.fullName} onChange={e => setProfile({...profile, fullName: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 text-sm font-black text-gray-900 outline-none border-2 border-transparent focus:border-blue-100 transition-colors" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-500 mr-2 block">رقم الهاتف</label>
            <input required value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 text-sm font-black text-gray-900 outline-none text-left border-2 border-transparent focus:border-blue-100 transition-colors" dir="ltr" placeholder="09xxxxxxx" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-500 mr-2 block">العنوان الوصفي</label>
            <textarea value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} placeholder="المنطقة، الشارع، المعالم..." className="w-full p-4 rounded-2xl bg-gray-50 text-sm font-black text-gray-900 outline-none h-24 resize-none border-2 border-transparent focus:border-blue-100 transition-colors placeholder:text-gray-400" />
          </div>

          <button type="submit" disabled={isSaving} className="w-full py-5 rounded-[30px] font-black text-xs shadow-xl bg-[#1E293B] text-white active:scale-95 transition-all mt-2">
            {isSaving ? "جاري الحفظ..." : "حفظ التغييرات ✨"}
          </button>
        </form>

        <button onClick={() => auth.signOut()} className="w-full py-4 rounded-[30px] bg-red-50 text-red-600 font-black text-[11px] border border-red-100 mb-10 shadow-sm active:scale-95 transition-all">تسجيل الخروج 🚪</button>
      </div>

      {showMapModal && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-end justify-center">
          <div className="bg-white w-full max-w-xl rounded-t-[40px] p-6 h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-6 px-2">
               <h3 className="font-black text-lg text-gray-900 italic">حدد موقعك بدقة 🗺️</h3>
               <button onClick={() => setShowMapModal(false)} className="text-red-500 font-black text-sm bg-red-50 px-4 py-2 rounded-2xl">إغلاق</button>
            </div>
            <div className="flex-1 rounded-[35px] overflow-hidden border-2 border-gray-100 shadow-inner bg-gray-50">
                <MapComponent 
                   mapCenter={mapCenter} 
                   setProfile={setProfile} 
                   profile={profile} 
                />
            </div>
            <button 
              onClick={() => setShowMapModal(false)}
              className="w-full mt-6 py-5 bg-[#1E293B] text-white rounded-3xl font-black text-sm shadow-xl"
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
