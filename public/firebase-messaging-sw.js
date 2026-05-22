// تصحيح السطر الأول ليكون بحرف صغير
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// إعدادات مشروع "راحة" الخاصة بك
const firebaseConfig = {
  apiKey: "AIzaSyCAR8E5kXtOGKLHnN-GuypIPp2G-MmUl6c",
  authDomain: "raha-sd.firebaseapp.com",
  projectId: "raha-sd",
  storageBucket: "raha-sd.firebasestorage.app",
  messagingSenderId: "510788454430",
  appId: "1:510788454430:web:62a1c9f92e5e86134d860f"
};

// تهيئة Firebase في السيرفس وركر
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// استقبال الإشعارات والتطبيق في الخلفية أو مغلق
messaging.onBackgroundMessage((payload) => {
  console.log('وصل إشعار في الخلفية:', payload);
  
  const notificationTitle = payload.notification.title || "تطبيق راحة ✨";
  const notificationOptions = {
    body: payload.notification.body || "لديك تحديث جديد بخصوص طلبك",
    icon: '/logo.png', // تأكد من أن شعار راحة موجود في مجلد public بهذا الاسم
    badge: '/logo.png', // أيقونة صغيرة تظهر في شريط الإشعارات
    data: payload.data // لحفظ البيانات الإضافية مثل الروابط
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// التعامل مع الضغط على الإشعار لفتح التطبيق
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/'; // فتح رابط معين لو وجد أو الصفحة الرئيسية

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      if (windowClients.length > 0) {
        windowClients[0].focus();
        return windowClients[0].navigate(urlToOpen);
      }
      return clients.openWindow(urlToOpen);
    })
  );
});
