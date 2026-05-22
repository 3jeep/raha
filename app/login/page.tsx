"use client";
import { useState, Suspense } from "react";
import { auth, db } from "@/lib/firebase";
import { getMessaging, getToken } from "firebase/messaging";
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { showToast } from "@/lib/utils";

// دالة ذكية لتحديث التوكن فقط عند الحاجة (مطابقة لمنطق الـ Flutter)
const updateFCMToken = async (uid: string) => {
  try {
    const messaging = getMessaging();
    const token = await getToken(messaging, { 
      vapidKey: "BOfHELSplTWlJ0tNuqx4sBQknMJIUE9pwI-rXnp2Hrl78p3_fuWzioJqQh14sVznCvAvSQUjHqu74jGzTpSPaUw" 
    });
    
    if (token) {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      const oldToken = userSnap.exists() ? userSnap.data().fcmToken : null;

      if (token !== oldToken) {
        await updateDoc(userRef, {
          fcmToken: token,
          lastTokenUpdate: serverTimestamp(),
        });
        console.log("FCM Token updated successfully ✅");
      }
    }
  } catch (error) {
    console.error("Error updating FCM token:", error);
  }
};

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
    if (!clean.startsWith("249")) return "249" + clean;
    return clean;
  };

  const handleAuthSuccess = async (uid: string) => {
    await updateFCMToken(uid);
    const returnUrl = sessionStorage.getItem('returnUrl');
    if (returnUrl) {
      sessionStorage.removeItem('returnUrl');
      router.push(returnUrl);
    } else {
      router.push("/");
    }
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
          email: result.user.email,
          role: "user", 
          createdAt: serverTimestamp() 
        });
      }
      showToast("تم تسجيل الدخول بنجاح! 🌈", "success");
      await handleAuthSuccess(result.user.uid);
    } catch (error) { 
      setErrorMessage("فشل تسجيل الدخول عبر جوجل.");
      showToast("خطأ في الاتصال بجوجل", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    const formattedPhone = formatSudanPhone(phone);
    const fakeEmail = `${formattedPhone}@raha.sd`;

    try {
      if (isLogin) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("phone", "==", formattedPhone));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          if (userData.email && !userData.email.endsWith("@raha.sd")) {
            setErrorMessage("هذا الرقم مرتبط بحساب Google.");
            setLoading(false);
            return;
          }
        }
        
        const cred = await signInWithEmailAndPassword(auth, fakeEmail, INTERNAL_PASSWORD);
        showToast("مرحباً بك مجدداً! 🚀", "success");
        await handleAuthSuccess(cred.user.uid);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, fakeEmail, INTERNAL_PASSWORD);
        await setDoc(doc(db, "users", cred.user.uid), {
          uid: cred.user.uid,
          fullName,
          phone: formattedPhone,
          email: fakeEmail,
          role: "user",
          createdAt: serverTimestamp()
        });
        showToast("تم إنشاء حسابك بنجاح ✨", "success");
        await handleAuthSuccess(cred.user.uid);
      }
    } catch (error: any) {
      setErrorMessage(error.code === "auth/invalid-credential" ? "الرقم غير مسجل." : "حدث خطأ.");
      showToast("خطأ في العملية", "error");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-white font-sans" dir="rtl">
      {/* ... (نفس واجهة الـ UI الخاصة بك) ... */}
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div>جاري التحميل...</div>}><AuthContent /></Suspense>;
}
