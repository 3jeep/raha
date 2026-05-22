"use client";
import { useState, useEffect, Suspense, lazy } from "react";
import { db, auth } from "@/lib/firebase";
import { 
  collection, onSnapshot, query, doc, getDoc, setDoc, where, updateDoc 
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";

const MapComponent = dynamic(() => import("./MapComponent"), { 
  ssr: false,
  loading: () => <div className="h-full bg-gray-50 flex items-center justify-center font-black italic text-gray-400">جاري تهيئة الخرائط...</div>
});

const libraries: ("places" | "geometry" | "maps")[] = ["places", "geometry", "maps"];

// --- 1. تعريف شريط التنقل السفلي ---
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
    <div className="fixed bottom-0 left-0 right-0 w-full bg-[#1E293B] h-16 shadow-2xl flex items-center justify-around px-2 z-50 border-t-2 border-[#1E293B] rounded-t-[25px]">
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

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [autocomplete, setAutocomplete] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([15.5007, 32.5599]);
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyCscTfT9KnGnoGj0dR96n8YbLFk5YdW2p0", 
    libraries,
    language: 'ar',
    region: 'SD',
  });

  const [profile, setProfile] = useState({
    fullName: "",
    phone: "",
    address: "",
    latitude: null as number | null,
    longitude: null as number | null
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) router.push("/login");
      else {
        setUser(currentUser);
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
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // دالة تسجيل الخروج مع حذف التوكن
  const handleLogout = async () => {
    try {
      if (user) {
        // حذف التوكن من قاعدة البيانات قبل تسجيل الخروج
        await updateDoc(doc(db, "users", user.uid), {
          fcmToken: null
        });
      }
      await signOut(auth);
      router.push("/login");
    } catch (err) {
      console.error("فشل تسجيل الخروج:", err);
    }
  };

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setProfile(prev => ({ ...prev, latitude: lat, longitude: lng, address: place.formatted_address || prev.address }));
        setMapCenter([lat, lng]);
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), { ...profile, updatedAt: new Date() }, { merge: true });
      alert("✅ تم حفظ التعديلات بنجاح");
    } catch (err) { alert("❌ فشل في حفظ البيانات"); }
    finally { setIsSaving(false); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black italic text-blue-900">جاري التحميل...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-40 text-right font-sans" dir="rtl">
      {/* القسم العلوي */}
      <div className="bg-[#1E293B] text-white pt-16 pb-28 px-8 rounded-b-[50px] shadow-2xl text-center relative overflow-visible">
        <div className="relative z-20">
          <div className="w-24 h-24 rounded-full border-4 border-white/30 mx-auto mb-4 shadow-2xl overflow-hidden bg-gray-700">
            <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${profile.fullName || 'User'}&background=random&color=fff`} className="w-full h-full object-cover" alt="Profile" />
          </div>
          <h1 className="text-2xl font-black italic tracking-tight">{profile.fullName || "مستخدم جديد"}</h1>
          <p className="text-[10px] opacity-90 font-black tracking-widest text-blue-300 mt-1 uppercase">{user?.email}</p>
        </div>
      </div>

      <div className="px-6 -mt-16 max-w-lg mx-auto space-y-5 relative z-10">
        <div className="bg-white p-6 rounded-[35px] shadow-xl border border-gray-100 flex justify-between items-center">
           <div>
              <span className="text-[11px] font-black text-blue-700 uppercase italic">موقع المنزل 📍</span>
              <p className="text-[9px] text-gray-400 font-bold mt-1">{profile.latitude ? "تم ربط الموقع بنجاح ✅" : "الموقع غير محدد حالياً ⚠️"}</p>
           </div>
           <button onClick={() => setShowMapModal(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black shadow-lg">تحديد الموقع</button>
        </div>

        <form onSubmit={handleUpdateProfile} className="bg-white p-8 rounded-[40px] shadow-xl space-y-5 border border-gray-100">
          <input required value={profile.fullName} onChange={e => setProfile({...profile, fullName: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 text-sm font-black" />
          <input required value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 text-sm font-black" dir="ltr" />
          <textarea value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 text-sm font-black h-24" />
          <button type="submit" disabled={isSaving} className="w-full py-5 rounded-[30px] font-black text-xs shadow-xl bg-[#1E293B] text-white">حفظ التغييرات ✨</button>
        </form>

        <button onClick={handleLogout} className="w-full py-4 rounded-[30px] bg-red-50 text-red-600 font-black text-[11px] border border-red-100 shadow-sm">تسجيل الخروج 🚪</button>
      </div>

      {showMapModal && (
        <div className="fixed inset-0 z-[9999] bg-white">
           <div className="absolute top-8 left-4 right-4 z-[10001] flex items-center gap-2">
             <Autocomplete onLoad={setAutocomplete} onPlaceChanged={onPlaceChanged}>
               <input className="w-full p-4 text-sm font-bold" placeholder="ابحث عن منطقتك..." />
             </Autocomplete>
             <button onClick={() => setShowMapModal(false)} className="bg-white p-4 rounded-2xl border">إغلاق</button>
           </div>
           <MapComponent mapCenter={mapCenter} setProfile={setProfile} profile={profile} />
           <button onClick={() => setShowMapModal(false)} className="absolute bottom-10 left-8 right-8 p-5 bg-blue-600 text-white rounded-[30px] font-black z-[10001]">تثبيت الموقع</button>
        </div>
      )}

      <Suspense fallback={null}><BottomNav /></Suspense>
    </div>
  );
}
