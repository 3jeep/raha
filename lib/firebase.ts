import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  terminate // أضفنا هذه للحماية
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCAR8E5kXtOGKLHnN-GuypIPp2G-MmUl6c",
  authDomain: "raha-sd.firebaseapp.com",
  projectId: "raha-sd",
  storageBucket: "raha-sd.firebasestorage.app",
  messagingSenderId: "510788454430",
  appId: "1:510788454430:web:62a1c9f92e5e86134d860f"
};

// 1. تهيئة التطبيق (منع التكرار)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// 2. تهيئة Firestore مع دعم العمل بدون إنترنت (Offline Support)
let db;

if (typeof window !== "undefined") {
    // التحقق مما إذا كان قد تم تهيئة Firestore مسبقاً لمنع خطأ الـ Re-initialization
    // نستخدم النسخة المخزنة في الـ window أو نهيئ واحدة جديدة
    if (!global.firestoreDb) {
        global.firestoreDb = initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            })
        });
    }
    db = global.firestoreDb;
} else {
    // في جانب السيرفر (Next.js Server Side)
    db = getFirestore(app);
}

// 3. تصدير الأدوات
export { db };
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
