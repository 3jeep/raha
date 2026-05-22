"use client";

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, where, updateDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { showToast } from "@/lib/utils";

const professionsList = [
  { id: "كهربائي", name: "كهربائي", icon: "⚡" },
  { id: "سباك (مواسيرجي)", name: "سباك (مواسيرجي)", icon: "🚰" },
  { id: "فني تكييف وتبريد", name: "فني تكييف وتبريد", icon: "❄️" },
  { id: "توصيل طلبات (ركشة/موتر)", name: "توصيل طلبات (ركشة/موتر)", icon: "🛵" },
  { id: "ممرض / ممرضة", name: "ممرض / ممرضة", icon: "🩺" },
  { id: "فني غسالات", name: "فني غسالات", icon: "🧺" },
  { id: "ميكانيكي", name: "ميكانيكي", icon: "🔧" },
  { id: "عامل مساعد", name: "عامل مساعد", icon: "🧹" },
  { id: "نقاش (بويجي)", name: "نقاش (بويجي)", icon: "🎨" },
  { id: "نجار", name: "نجار", icon: "🪚" },
  { id: "فني ستالايت (دش)", name: "فني ستالايت (دش)", icon: "📡" },
  { id: "مبلط (سيراميك)", name: "مبلط (سيراميك)", icon: "🧱" },
  { id: "حداد", name: "حداد", icon: "⚒️" },
  { id: "بناء", name: "بناء", icon: "🏗️" },
  { id: "مساعد بناء (طُلبة)", name: "مساعد بناء (طُلبة)", icon: "🧱" },
  { id: "طباخ", name: "طباخ", icon: "👨‍🍳" },
  { id: "حلاق (خدمة منزلية)", name: "حلاق (خدمة منزلية)", icon: "✂️" },
  { id: "غسيل عربات", name: "غسيل عربات", icon: "🚿" }
];

export default function ManageHandyman() {
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    profession: professionsList[0].id, phone: "", bio: "", locationName: "", lat: 0, lng: 0
  });

  useEffect(() => {
    onAuthStateChanged(auth, async (u) => {
      if (!u) return useRouter().push('/login');
      setUser(u);
      const userSnap = await getDoc(doc(db, "users", u.uid));
      if (userSnap.exists()) setFullName(userSnap.data().fullName);
      fetchServices(u.uid);
    });
  }, []);

  const fetchServices = async (uid: string) => {
    setLoading(true);
    const q = query(collection(db, "handymen"), where("uid", "==", uid));
    const snap = await getDocs(q);
    setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  const updateCurrentLocation = () => {
    if (!navigator.geolocation) return showToast("متصفحك لا يدعم الموقع", "error");
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        showToast("تم تحديد الموقع بدقة 📍", "success");
        setIsLocating(false);
      },
      () => { showToast("يرجى تفعيل الموقع", "error"); setIsLocating(false); },
      { enableHighAccuracy: true }
    );
  };

  const saveToFirebase = async () => {
    if (!form.locationName || !form.phone) return showToast("أكمل البيانات المطلوبة", "error");
    if (form.lat === 0) return showToast("يرجى تحديد الموقع أولاً", "error");
    
    setLoading(true);
    const data = { ...form, uid: user.uid, name: fullName, updatedAt: serverTimestamp() };

    try {
      if (editingId) {
        await updateDoc(doc(db, "handymen", editingId), data);
        showToast("تم التعديل بنجاح ✨", "success");
      } else {
        await addDoc(collection(db, "handymen"), { ...data, isVerified: false, isActive: true, rating: 5, total_calls: 0, reviewsCount: 0, createdAt: serverTimestamp() });
        showToast("تمت الإضافة بنجاح ✨", "success");
      }
      resetForm();
      fetchServices(user.uid);
    } catch (e) { showToast("فشل الحفظ", "error"); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setForm({ profession: professionsList[0].id, phone: "", bio: "", locationName: "", lat: 0, lng: 0 });
  };

  if (loading) return <div className="p-10 text-center">جاري التحميل...</div>;

  return (
    <div className="p-4 max-w-md mx-auto" dir="rtl">
      <h1 className="text-xl font-black mb-6">أهلاً {fullName} 👋</h1>

      {!showForm && !editingId && (
        <button onClick={() => setShowForm(true)} className="w-full bg-black text-white p-5 rounded-3xl font-black text-sm shadow-xl mb-6">
          + إضافة حرفة جديدة
        </button>
      )}

      {(showForm || editingId) && (
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 mb-8">
          <h2 className="mb-4 font-black">{editingId ? "تعديل الحرفة" : "إضافة حرفة جديدة"}</h2>
          <select className="w-full mb-3 p-4 bg-gray-50 rounded-2xl font-bold" value={form.profession} onChange={e => setForm({...form, profession: e.target.value})}>
             {professionsList.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
          </select>
          <input className="w-full mb-3 p-4 bg-gray-50 rounded-2xl" placeholder="اسم المنطقة" value={form.locationName} onChange={e => setForm({...form, locationName: e.target.value})} />
          <input className="w-full mb-3 p-4 bg-gray-50 rounded-2xl" placeholder="رقم الهاتف" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
          <textarea className="w-full mb-3 p-4 bg-gray-50 rounded-2xl h-24" placeholder="نبذة عنك" value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} />
          
          <button className={`w-full p-4 rounded-2xl mb-3 font-black ${isLocating ? 'bg-yellow-400' : form.lat !== 0 ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white'}`} onClick={updateCurrentLocation}>
            {isLocating ? "⏳ جاري جلب الموقع..." : form.lat !== 0 ? "✅ موقعك محدث" : "📍 تحديد موقعي بدقة (GPS)"}
          </button>

          <button className="w-full bg-black text-white p-4 rounded-2xl font-black mb-2" onClick={saveToFirebase}>
            {editingId ? "حفظ التعديلات" : "نشر الحرفة"}
          </button>
          <button className="w-full text-gray-400 text-xs font-bold" onClick={resetForm}>إلغاء</button>
        </div>
      )}

      <div className="space-y-4">
        {services.map(s => (
          <div key={s.id} className="p-5 bg-white rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-black text-lg">{s.profession}</p>
                <p className="text-xs text-gray-500">📍 {s.locationName}</p>
              </div>
              {s.isVerified && <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">✔ موثق</span>}
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-gray-50 p-2 rounded-xl"><p className="text-[9px] text-gray-400">التقييم</p><p className="font-black text-sm">⭐ {s.rating || 0}</p></div>
              <div className="bg-gray-50 p-2 rounded-xl"><p className="text-[9px] text-gray-400">مرات الاتصال</p><p className="font-black text-sm">📞 {s.total_calls || 0}</p></div>
            </div>

            <p className="text-[9px] text-gray-400 text-center">إضافة: {s.createdAt?.toDate().toLocaleDateString('ar-EG')}</p>

            <div className="flex gap-2 border-t pt-4">
              <button onClick={() => { setEditingId(s.id); setForm(s); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="flex-1 text-blue-600 font-black text-xs bg-blue-50 py-3 rounded-2xl">تعديل</button>
              <button onClick={async () => { if(confirm("حذف هذه الحرفة؟")) { await deleteDoc(doc(db, "handymen", s.id)); fetchServices(user.uid); }}} className="flex-1 text-red-600 font-black text-xs bg-red-50 py-3 rounded-2xl">مسح</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
