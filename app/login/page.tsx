"use client";
import { useState, useEffect, Suspense } from "react";
import { auth, db } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider, 
  signInWithPopup, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

function AuthContent() {
  const [isLogin, setIsLogin] = useState(true); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(""); 
  const [phone, setPhone] = useState("");       
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // التعديل: التوجيه الافتراضي أصبح للصفحة الرئيسية مباشرة "/"
  const redirectTo = searchParams.get("redirect") || "/";
  const googleIconUrl = "https://cdn-icons-png.flaticon.com/512/2991/2991148.png";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace(decodeURIComponent(redirectTo));
      } else {
        setCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router, redirectTo]);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // بعد نجاح جوجل، التوجيه للرئيسية
      router.push("/");
    } catch (error) {
      console.error("خطأ جوجل:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: fullName });
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          fullName,
          phone,
          email,
          role: "user",
          createdAt: serverTimestamp()
        });
      }
      // التوجيه للرئيسية فوراً بعد النجاح
      router.push("/");
    } catch (error: any) {
      alert(isLogin ? "البيانات غير صحيحة" : "حدث خطأ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) return alert("أدخل بريدك أولاً");
    try {
      await sendPasswordResetEmail(auth, email);
      alert("تم إرسال رابط استعادة كلمة السر");
    } catch (error) {
      alert("حدث خطأ");
    }
  };

  if (checkingAuth) return <div className="h-screen flex items-center justify-center bg-white font-black text-gray-900 text-lg italic">جاري التحقق...</div>;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-6 text-right font-sans" dir="rtl">
      
      <div className="mt-8 mb-6 flex flex-col items-center">
        <img 
          src="/icon.png" 
          className="w-28 h-28 rounded-[35px] object-cover shadow-2xl border-4 border-gray-50" 
          alt="Logo" 
        />
        <h1 className="text-3xl font-black text-gray-900 mt-6 text-center italic">
          {isLogin ? "مرحباً بعودتك 👋" : "انضم إلينا ✨"}
        </h1>
        <p className="text-gray-600 text-[11px] mt-2 font-black text-center opacity-80 uppercase tracking-tighter">
          {isLogin ? "سجل دخولك لمتابعة خدماتك في راحة" : "أنشئ حسابك واستمتع بأفضل الخدمات المنزلية"}
        </p>
      </div>

      <div className="w-full max-w-sm mb-6">
        <button 
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 border-2 border-gray-100 p-5 rounded-3xl font-black hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
        >
          <img src={googleIconUrl} className="w-6 h-6" alt="Google" />
          <span className="text-gray-900 text-[13px] font-black">المتابعة باستخدام Google</span>
        </button>
      </div>

      <div className="flex items-center mb-6 w-full max-w-sm text-gray-300">
        <div className="flex-1 h-[1px] bg-gray-100"></div>
        <span className="px-4 text-[9px] font-black uppercase tracking-widest italic text-gray-400">أو تعبئة البيانات</span>
        <div className="flex-1 h-[1px] bg-gray-100"></div>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        
        {!isLogin && (
          <>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-900 mr-1 italic uppercase">الاسم الكامل:</label>
              <input 
                required 
                className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-blue-100 rounded-2xl outline-none font-black text-gray-900 text-md placeholder:text-gray-300"
                placeholder="إبراهيم أحمد..."
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-900 mr-1 italic uppercase">رقم الهاتف:</label>
              <input 
                required 
                type="tel"
                className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-blue-100 rounded-2xl outline-none font-black text-gray-900 text-md text-left"
                placeholder="09..."
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-900 mr-1 italic uppercase">البريد الإلكتروني:</label>
          <input 
            type="email"
            required
            className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-blue-100 rounded-2xl outline-none font-black text-gray-900 text-md text-left placeholder:text-gray-300"
            placeholder="example@mail.com"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="relative space-y-1">
          <label className="text-[10px] font-black text-gray-900 mr-1 italic uppercase">كلمة المرور:</label>
          <input 
            type={showPassword ? "text" : "password"}
            required
            className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-blue-100 rounded-2xl outline-none font-black text-gray-900 text-md text-left placeholder:text-gray-300"
            placeholder="••••••••"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute left-4 top-10 text-xl grayscale"
          >
            {showPassword ? "👁️" : "👁️‍🗨️"}
          </button>
        </div>

        {isLogin && (
          <div className="flex justify-start">
            <button type="button" onClick={handleForgotPassword} className="text-[10px] text-blue-700 font-black italic underline">نسيت كلمة السر؟</button>
          </div>
        )}

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white p-5 rounded-3xl font-black text-xs shadow-2xl hover:bg-black active:scale-95 transition-all disabled:bg-gray-400 mt-2"
        >
          {loading ? "جاري المعالجة..." : (isLogin ? "دخول إلى راحة 🚀" : "إنشاء حساب جديد ✨")}
        </button>
      </form>

      <div className="mt-8 mb-6 text-center">
        <p className="text-[13px] font-black text-gray-600 italic">
          {isLogin ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-700 font-black mr-2 underline decoration-2 underline-offset-4"
          >
            {isLogin ? "اشترك الآن" : "سجل دخولك"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center font-black text-gray-900">جاري التحميل...</div>}>
      <AuthContent />
    </Suspense>
  );
}
