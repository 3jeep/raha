import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
// استيراد أداة الإشعارات
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCAR8E5kXtOGKLHnN-GuypIPp2G-MmUl6c",
  authDomain: "raha-sd.firebaseapp.com",
  projectId: "raha-sd",
  storageBucket: "raha-sd.firebasestorage.app",
  messagingSenderId: "510788454430",
  appId: "1:510788454430:web:62a1c9f92e5e86134d860f"
};

// 1. تهيئة التطبيق (منع التكرار)
// أضفنا export هنا لحل مشكلة الـ utils.ts
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// 2. تهيئة Firestore و الـ Messaging
let db;
let messaging;

if (typeof window !== "undefined") {
    // تهيئة Firestore مع دعم الـ Offline
    if (!global.firestoreDb) {
        global.firestoreDb = initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            })
        });
    }
    db = global.firestoreDb;

    // تهيئة الإشعارات فقط في المتصفح
    try {
        messaging = getMessaging(app);
    } catch (err) {
        console.log("Messaging not supported in this browser:", err);
    }
} else {
    // في جانب السيرفر
    db = getFirestore(app);
}

// 3. تصدير الأدوات
export { db, messaging }; 
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// الحفاظ على التصدير الافتراضي أيضاً لزيادة التوافق
export default app;
