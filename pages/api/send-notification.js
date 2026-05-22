import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "raha-sd",
        clientEmail: "firebase-adminsdk-fbsvc@raha-sd.iam.gserviceaccount.com",
        privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDCgaEdl1yp7OqK\nnEtTVXYFHdy+CaXNKF77X+3dxC2TetWoMyQiolfOXhtmZeEzVnH19N25adIj6zfQ\nQA8xvj1FluSyRdQ4VmZOwvW+xJ6ZVDUk9B+u+H6vP3c1WV0/UKxBhz1uCQfb8iE+\nCz8FgR/RWRt4dh0P8jccj4GyZKx8tif7KJW/R4+h/a+T0Mu5iZllyDqH6DLeA7BM\nXVUPo5q/b7tP2UbI1Kny2hKgg3a9JxeWNhlAqlEEqRd5OdPGFsQBuIb9OafR/s6s\nKB4CuXIGifrD7OssaDe3bRXNRoFBBngw4o20DWjF5hAu2E/cHy79OJzgnS9w9Bmo\npqh30zybAgMBAAECggEAKn3BIcLIRoLwNfmw5vKbhsCgUY+v/eKc5VNulmzd/ALw\nm/8YHMzUW8vpNnR5PwraeH3W1kOM2bXwCnmEGDzUC9jL+zoQA4K0dO5YWyV+9EYW\nGg2Owl2c51H5C9mK6mMIToRp4hjs85qwsmooiV5NAiHyQ12iObKTYZTkI4GkwNV0\nME47qfoq4szt7eGK47R0bCh2meanQa+jrGY0Kxu2Q57rfLH4tebwGzJZpcjLExsf\n2ZrHkinQwzE2dFxCjy2BnIdyX9h9s15M+IW5GKzf153PBCzQ2f/56wu68Su8qwYW\nDDFKCQFMbalHHj/OHYrAZ2W6vKv+mwqDMRfE1KmKkQKBgQD7sd/q79elaOEPxd23\njn5ATQkFbbF7+ctFD9JYwVqHU3i3NgmZ30/h2Jm4+E5aNUAfVpNyH39W458+Ri1S\nq8EFVofBnM02V4S4dnRsuTXyt0358ZbzXocv8cUxqDTF9OPP3r5ZKEMeC8RDe1PB\nJh36ZIIdxqDY3VVS7ze3nCFB4wKBgQDF1VZB2JPJThbfFpK0hOOvoQTSZMW0ZmUP\nmLP1U6JLaygvuBWQe+Ewj1za5bpBNM5wIGd20Qlzqj0VVx6eeSfm74xE3KBXckmW\nfXaVJ0pOHExRLayVEcslSv/iDfR/1HsvLFXWoXAcby5IzYACW6e7DsuqPaUXtPvX\nhYITIMe36QKBgQDhJjfY0J4GMHCLjIOOjJ/xYzf7rCmFbmlgKQwQKz6RKaEluugR\nxkqODBVO+ogUd+gZYHfbMcPWdR3hNiOa/VtYLBSapGqJ/vYRkJ0LGQ7iRQky2eMf\n2ZrHkinQwzE2dFxCjy2BnIdyX9h9s15M+IW5GKzf153PBCzQ2f/56wu68Su8qwYW\nDDFKCQFMbalHHj/OHYrAZ2W6vKv+mwqDMRfE1KmKkQKBgCyDVgc2zfnrgiXsFFJd\n3EU2O7mDRyDSMUcTGtrGWKwTjlU+XEvIM+ETQNdX/VKSqSh9ggov+qp10Yytr4wE\nwr+pgqwz4DgM1RXxYO8qigONRna1ijF4cXcQqwaYET1598Wj\neiTy6iDbu1RSOM1PBiyGpbjGahEtfcT+m0fmhkmRAoGAKpzflX7+D4ob5WPgFdgO\ndIv3MY34sYmGl2cG47mC0GNgHOGBJIFiEux8alurOdiUJvQmHpq6x+jrEMmMHlfs\n+zjN2vis2h2xniECUO7BL8H/2MS9REZk1N2hNRqBtKoNItgMdHTcTB1vAJcE8uBH\nRGL8KoIH/AKVC4IIr70zNt0=\n-----END PRIVATE KEY-----\n".replace(/\\n/g, '\n'),
      }),
    });
  } catch (e) { console.error("Firebase Init Error:", e); }
}

const TEMPLATES = {
  // --- إشعارات الخدمات العامة والزيارات ---
  "pending": { 
    title: "راحة ✨ | تم استلام طلبك", 
    body: "تم إرسال طلبك بنجاح! سيتم التواصل معك لتنسيق المواعيد. شكراً لاختيارك راحة لقلبك وبيتك." 
  },
  "new-order-admin": { 
    title: "إشعار إداري 🔔", 
    body: "هناك طلب جديد (خدمات/غسيل/عقود) بانتظار المراجعة والتنفيذ الآن." 
  },
  "in-progress": { 
    title: "راحة ✨ | بدأت الخدمة", 
    body: "أبشر.. الفريق في طريقه إليك أو بدأ العمل الآن. بيتكم عامر دائماً." 
  },
  "completed": { 
    title: "راحة ✨ | تم اكتمال الطلب", 
    body: "تمت المهمة بنجاح! شكراً لثقتكم، نتمنى نكون أسعدناكم." 
  },
  "cancelled": {
    title: "تحديث حول طلبك ⚠️",
    body: "آسفين جداً، لا يمكننا استلام الطلبات حالياً لمشغولية جميع الطواقم. يرجى اختيار وقت آخر."
  },

  // --- إشعارات خدمة الغسيل (Laundry) المخصصة ---
  "laundry-received": {
    title: "راحة 🧼 | استلام الملابس",
    body: "ملابسك وصلت المغسلة وبدأنا العمل عليها الآن. ستعود إليك زاهية كما تحب."
  },
  "laundry-completed": {
    title: "راحة 🧺 | الملابس جاهزة",
    body: "تم الانتهاء من غسيل وكي ملابسك وهي في طريقها إليك الآن. ملبوس العافية!"
  },

  // --- إشعارات الحذف الخاصة بالمشرفين والأدمن (Security Log) ---
  "admin-delete-user": {
    title: "تنبيه أمني ⚠️ | حذف مستخدم",
    body: "تم تنفيذ عملية حذف نهائي لحساب مستخدم من قاعدة البيانات بواسطة الإدارة."
  },
  "admin-clear-archive": {
    title: "تنبيه إداري ⚙️ | تنظيف الأرشيف",
    body: "تمت عملية مسح جماعي لسجلات الأرشيف (الطلبات المكتملة) بنجاح."
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token, status, userId, customerName, orderId, body: customBody } = req.body;
  const template = TEMPLATES[status] || { title: "تحديث من راحة", body: "هناك تحديث جديد لطلبك" };
  
  let finalBody = customBody || template.body;
  
  // تخصيص الاسم للعملاء فقط (تجنب الإشعارات الإدارية)
  const isAdminEvent = status.startsWith("admin-") || status === "new-order-admin";
  
  if (!isAdminEvent && customerName && !customBody) {
    finalBody = `يا ${customerName}، ${template.body}`;
  }

  try {
    if (userId) {
      await admin.firestore().collection('notifications').add({
        userId,
        title: template.title,
        body: finalBody,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        orderId: orderId || ""
      });
    }

    if (token) {
      const message = {
        notification: { title: template.title, body: finalBody },
        token: token
      };
      await admin.messaging().send(message);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
