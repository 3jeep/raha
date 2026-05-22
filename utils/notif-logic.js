import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";

/**
 * وظيفة الإشعارات الذكية المحدثة لمشروع راحة
 */
export const sendSmartNotification = async (target, status, data = {}) => {
  console.log("🚀 بدء معالجة الإشعار...");

  try {
    // 1. تحديد النصوص بناءً على الحالة (Status)
    let notifTitle = data.title;
    let notifBody = data.body;

    if (!notifTitle || !notifBody) {
      if (target === 'admin') {
        // تخصيص إشعار الإدارة عند وصول طلب جديد (سواء غسيل أو غيره)
        if (status === 'new-order') {
          notifTitle = "طلب غسيل جديد 🧺";
          notifBody = `وصل طلب جديد من ${data.customerName || 'عميل'}. راجع لوحة التحكم.`;
        } else {
          notifTitle = "تنبيه جديد للإدارة 🔔";
          notifBody = `هناك تحديث جديد للطلب رقم ${data.orderId || ''}`;
        }
      } else {
        // نصوص مخصصة للعملاء بلهجة مناسبة
        if (status === 'pending') {
          notifTitle = "تم استلام طلبك 🧺";
          notifBody = `يا ${data.customerName || 'عزيزنا'}، طلبك الآن في قائمة الانتظار وسيتم التواصل معك قريباً.`;
        } else if (status === 'in-progress') {
          notifTitle = "بدأنا العمل! 🚀";
          notifBody = `يا ${data.customerName || 'عزيزنا'}، فريق راحة بدأ تنفيذ طلبك الآن.`;
        } else {
          notifTitle = "اكتملت المهمة ✨";
          notifBody = "تم إنهاء الزيارة بنجاح، شكراً لاختيارك راحة.";
        }
      }
    }

    // --- الخطوة 1: الحفظ في Firestore لظهورها في "مركز الإشعارات" داخل التطبيق ---
    if (data.userId) {
      await addDoc(collection(db, "notifications"), {
        userId: data.userId,
        title: notifTitle,
        body: notifBody,
        orderId: data.orderId || "",
        status: status,
        isRead: false,
        createdAt: serverTimestamp(),
      });
      console.log("✅ تم الحفظ في كولكشن notifications");
    }

    // --- الخطوة 2: جلب التوكنات لإرسال الـ Push Notification ---
    let targetTokens = [];
    if (target === 'admin') {
      const q = query(collection(db, "users"), where("role", "in", ["admin", "manager"]));
      const snap = await getDocs(q);
      targetTokens = snap.docs.map(d => d.data().fcmToken).filter(t => !!t);
    } else if (target === 'user' && data.token) {
      targetTokens = [data.token];
    }

    if (targetTokens.length === 0) {
      console.log("ℹ️ لا توجد توكنات نشطة، تم الاكتفاء بحفظ الإشعار داخلياً.");
      return;
    }

    // --- الخطوة 3: إرسال الـ Push Notification عبر الـ API الخاص بك ---
    // تم استخدام /api/send-notification كونه المسار القياسي للوصول لملفات pages/api
    await Promise.all(targetTokens.map(token =>
      fetch("/api/send-notification", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          title: notifTitle,
          body: notifBody,
          status,
          userId: data.userId,
          orderId: data.orderId,
          url: data.url || "/my-chekout"
        }),
      })
    ));

    console.log(`✅ تم إرسال Push Notification لـ ${targetTokens.length} جهاز`);

  } catch (error) {
    console.error("❌ خطأ في نظام الإشعارات:", error);
  }
};
