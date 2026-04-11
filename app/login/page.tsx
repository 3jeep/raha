"use client";
import { useState, Suspense } from "react";
import { auth, db } from "@/lib/firebase";
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail // لاستطلاع طرق تسجيل الدخول
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";

function AuthContent() {
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  const INTERNAL_PASSWORD = "RahaInternalPassword123!";

  const formatSudanPhone = (input: string) => {
    let clean = input.replace(/\D/g, "");
    if (clean.startsWith("0")) return "249" + clean.substring(1);
    return clean;
  };

  const handleGoogleLogin = async () => {
    setErrorMessage("");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, { 
          uid: result.user.uid, 
          fullName: result.user.displayName, 
          phone: "", 
          email: result.user.email, // حفظ الإيميل للتحقق لاحقاً
          role: "user", 
          createdAt: serverTimestamp() 
        });
      }
      router.push("/");
    } catch (error) { setErrorMessage("فشل تسجيل الدخول عبر جوجل."); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    const formattedPhone = formatSudanPhone(phone);
    const fakeEmail = `${formattedPhone}@raha.sd`;

    try {
      if (isLogin) {
        // --- منطق التحقق الذكي ---
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("phone", "==", formattedPhone));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          // إذا كان المستخدم مسجل بإيميل جوجل وليس ايميل راحة
          if (userData.email && !userData.email.endsWith("@raha.sd")) {
            setErrorMessage("هذا الرقم مرتبط بحساب Google. يرجى تسجيل الدخول عبر Google.");
            setLoading(false);
            return;
          }
        }
        
        // إذا لم يكن مرتبطاً بجوجل، أكمل الدخول العادي
        await signInWithEmailAndPassword(auth, fakeEmail, INTERNAL_PASSWORD);
        router.push("/");
      } else {
        // إنشاء حساب جديد
        const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, INTERNAL_PASSWORD);
        await setDoc(doc(db, "users", userCredential.user.uid), {
          uid: userCredential.user.uid,
          fullName,
          phone: formattedPhone,
          email: fakeEmail, // تمييزه بأنه حساب رقم هاتف
          role: "user",
          createdAt: serverTimestamp()
        });
        router.push("/");
      }
    } catch (error: any) {
      if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found") 
        setErrorMessage("الرقم غير مسجل. اضغط على 'إنشاء حساب جديد'.");
      else 
        setErrorMessage("حدث خطأ، يرجى المحاولة لاحقاً.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-white font-sans" dir="rtl">
      
      {/* 1. الشعار */}
      <div className="flex flex-col items-center mt-2 mb-6">
        <img src="/icon.png" alt="Logo" className="w-20 h-20 rounded-2xl shadow-lg" />
        <h1 className="text-xl font-black text-gray-900 mt-4 italic">
          {isLogin ? "دخول إلى راحة" : "انضم إلى راحة"}
        </h1>
      </div>
      
      {/* 2. الفورم */}
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="bg-red-50 p-4 rounded-xl text-red-600 text-xs font-bold text-center border-r-4 border-red-500 animate-shake">
              ⚠️ {errorMessage}
            </div>
          )}
          
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-[10px] font-black mr-1 text-gray-900 uppercase">الاسم الكامل</label>
              <input 
                required 
                placeholder="مثال: عزة محمد علي" 
                className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border-2 border-transparent focus:border-gray-200 transition-all" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
              />
            </div>
          )}
          
          <div className="space-y-1">
            <label className="text-[10px] font-black mr-1 text-gray-900 uppercase">رقم الهاتف</label>
            <input 
              required 
              type="tel" 
              placeholder="اضغط لكتابه رقم الهاتف" 
              className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-left text-sm border-2 border-transparent focus:border-black" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              dir="ltr" 
            />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-black text-white p-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all mt-2">
            {loading ? "جاري التحقق..." : (isLogin ? "تسجيل الدخول 🚀" : "إتمام التسجيل ✨")}
          </button>
        </form>

        <button 
          type="button"
          onClick={() => { setIsLogin(!isLogin); setErrorMessage(""); }} 
          className="w-full mt-6 p-4 border-2 border-black rounded-2xl font-black text-xs hover:bg-black hover:text-white transition-all active:scale-95 shadow-sm"
        >
          {isLogin ? "إنشاء حساب جديد ✨" : "العودة لتسجيل الدخول 🚀"}
        </button>
      </div>

      {/* 4. قوقل في الأسفل */}
      <div className="w-full max-w-sm mt-auto mb-10 pt-6 border-t border-gray-200 flex flex-col items-center">
        <p className="text-[10px] font-black text-gray-400 mb-4 uppercase tracking-widest text-center">أو عبر الطرق الأخرى</p>
        <button 
          type="button"
          onClick={handleGoogleLogin} 
          className="w-full flex items-center justify-center gap-3 border border-gray-200 p-4 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
        >
          <img src="https://cdn-icons-png.flaticon.com/512/2991/2991148.png" className="w-5 h-5" alt="G" />
          <span className="text-xs font-black text-gray-600">الدخول السريع عبر Google</span>
        </button>
      </div>

    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="h-screen flex items-center justify-center font-black">جاري التحميل...</div>}><AuthContent /></Suspense>;
}
