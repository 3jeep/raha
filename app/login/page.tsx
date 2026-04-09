"use client";
import { useState, useEffect, Suspense } from "react";
import { auth } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  sendPasswordResetEmail,
  onAuthStateChanged 
} from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true); // حالة للتأكد من حالة المستخدم أولاً
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = searchParams.get("redirect") || "/";
  const googleIconUrl = "https://cdn-icons-png.flaticon.com/512/2991/2991148.png";

  // --- التعديل الجديد: التحقق من الدخول عند فتح الصفحة ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // إذا كان المستخدم مسجلاً، انقله فوراً للصفحة المطلوبة أو الرئيسية
        router.replace(decodeURIComponent(redirectTo));
      } else {
        // إذا لم يكن مسجلاً، اسمح بعرض محتوى صفحة تسجيل الدخول
        setCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router, redirectTo]);

  const handleAuthSuccess = () => {
    router.push(decodeURIComponent(redirectTo));
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        handleAuthSuccess();
      }
    } catch (error) {
      console.error("خطأ في دخول جوجل:", error);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      handleAuthSuccess();
    } catch (error) {
      alert("عذراً، البريد الإلكتروني أو كلمة المرور غير صحيحة");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert("الرجاء إدخال بريدك الإلكتروني أولاً في الحقل المخصص.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("تم إرسال رابط استعادة كلمة السر لبريدك الإلكتروني.");
    } catch (error) {
      alert("حدث خطأ في إرسال الرابط، تأكد من صحة البريد.");
    }
  };

  // إذا كان النظام لا يزال يتأكد من حالة المستخدم، نعرض شاشة تحميل بسيطة
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-6 text-right font-sans" dir="rtl">
      {/* ... باقي كود التصميم الخاص بك كما هو بدون تغيير ... */}
      <div className="mt-12 mb-10 flex flex-col items-center">
        <img 
          src="/icon.png" 
          className="w-32 h-32 rounded-full object-cover shadow-2xl border-4 border-blue-50" 
          alt="Logo" 
          onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/128?text=Raha"; }}
        />
        <h1 className="text-3xl font-black text-blue-900 mt-6 text-center">تسجيل الدخول</h1>
        <p className="text-gray-400 text-sm mt-1 font-medium text-center">أهلاً بك مجدداً في منصة راحة</p>
      </div>

      <div className="w-full max-w-sm mb-8">
        <button 
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 border-2 border-gray-100 p-4 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
        >
          <img src={googleIconUrl} className="w-6 h-6" alt="GoogleIcon" />
          <span className="text-gray-700 text-base font-bold">المتابعة باستخدام Google</span>
        </button>
      </div>

      <div className="flex items-center mb-8 w-full max-w-sm">
        <div className="flex-1 h-[1px] bg-gray-100"></div>
        <span className="px-4 text-gray-400 text-[10px] font-bold uppercase tracking-widest">أو عبر البريد</span>
        <div className="flex-1 h-[1px] bg-gray-100"></div>
      </div>

      <form onSubmit={handleEmailLogin} className="w-full max-w-sm space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">البريد الإلكتروني</label>
          <input 
            type="email"
            required
            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-900 text-right"
            placeholder="example@mail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="relative">
          <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">كلمة المرور</label>
          <input 
            type={showPassword ? "text" : "password"}
            required
            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-900 text-right"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute left-4 top-[46px] text-xl grayscale hover:grayscale-0 transition-all focus:outline-none"
          >
            {showPassword ? "👁️" : "👁️‍🗨️"}
          </button>
        </div>

        <div className="flex justify-start">
          <button 
            type="button" 
            onClick={handleForgotPassword}
            className="text-xs text-blue-600 font-bold hover:underline"
          >
            نسيت كلمة السر؟
          </button>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all disabled:bg-gray-300 mt-2"
        >
          {loading ? "جاري الدخول..." : "دخول"}
        </button>
      </form>

      <p className="mt-auto mb-6 text-sm text-gray-500 text-center">
        ليس لديك حساب؟ 
        <Link 
          href={`/register?redirect=${encodeURIComponent(redirectTo)}`} 
          className="text-blue-600 font-black hover:underline mr-1"
        >
          اشترك الآن
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-blue-600 font-bold">جاري التحميل...</div>}>
      <LoginContent />
    </Suspense>
  );
}
