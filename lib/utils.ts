// lib/utils.ts
import { db } from "./firebase"; 
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore";

/**
 * 0. اختصارات وحماية البيانات (Storage & Constants)
 */

// اختصار للوقت الخاص بفايربيس لاستخدامه في الصفحات بسهولة
export const st = serverTimestamp();

// دالة جلب البيانات من التخزين المحلي مع حماية من أخطاء الـ SSR في Next.js
export const getFromLocal = (key: string) => {
  if (typeof window === "undefined") return null;
  const item = localStorage.getItem(key);
  try {
    // محاولة تحويل النص إلى كائن إذا كان مخزناً كـ JSON
    return item ? JSON.parse(item) : null;
  } catch (e) {
    // إذا لم يكن JSON (نص عادي مثل "super") ارجعه كما هو
    return item;
  }
};

// دالة حفظ البيانات في التخزين المحلي
export const saveToLocal = (key: string, value: any) => {
  if (typeof window === "undefined") return;
  const data = typeof value === 'string' ? value : JSON.stringify(value);
  localStorage.setItem(key, data);
};

/**
 * 1. نظام التنبيهات الاحترافي (Toast System)
 */
export const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  if (typeof document === "undefined") return;

  const existing = document.querySelector(".custom-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `custom-toast ${type}`;
  
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  };

  toast.innerHTML = `<span>${icons[type]}</span> ${message}`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translate(-50%, 20px)";
    toast.style.transition = "all 0.5s ease";
    setTimeout(() => { if (document.body.contains(toast)) document.body.removeChild(toast); }, 500);
  }, 3000);
};

/**
 * 2. عمليات الفايربيس (Firebase CRUD)
 */

export const fetchData = async (collectionName: string, filterField?: string, filterValue?: any) => {
  try {
    let q = query(collection(db, collectionName), orderBy("createdAt", "desc"));
    if (filterField && filterValue) {
      q = query(q, where(filterField, "==", filterValue));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Fetch Error:", error);
    return [];
  }
};

export const handleSave = async (collectionName: string, data: any) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: st, // استخدام الاختصار
    });
    showToast("تم الحفظ بنجاح");
    return docRef.id;
  } catch (error) {
    showToast("حدث خطأ أثناء الحفظ", "error");
    throw error;
  }
};

export const handleUpdate = async (collectionName: string, id: string, newData: any) => {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...newData,
      updatedAt: st, // استخدام الاختصار
    });
    showToast("تم التحديث بنجاح");
    return true;
  } catch (error) {
    showToast("فشل في التعديل", "error");
    return false;
  }
};

export const handleDelete = async (collectionName: string, id: string) => {
  if (!confirm("هل أنت متأكد من قرار الحذف؟")) return false;
  try {
    await deleteDoc(doc(db, collectionName, id));
    showToast("تم الحذف بنجاح");
    return true;
  } catch (error) {
    showToast("خطأ أثناء الحذف", "error");
    return false;
  }
};

/**
 * 3. خدمات الموقع الجغرافي والخرائط (GPS & Maps)
 */

export const getCurrentGPSLocation = (): Promise<{ lat: number; lng: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      showToast("المتصفح لا يدعم تحديد الموقع", "error");
      reject("Not supported");
    }
    showToast("جاري تحديد موقعك الحالي...", "info");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        showToast("تم تحديد الموقع بنجاح");
        resolve(location);
      },
      (err) => {
        showToast("فشل تحديد الموقع، تأكد من الـ GPS", "error");
        reject(err);
      }
    );
  });
};

export const openInGoogleMaps = (loc: { lat: number; lng: number } | null) => {
  if (loc && loc.lat && loc.lng) {
    window.open(`https://www.google.com/maps?q=${loc.lat},${loc.lng}`, "_blank");
  } else {
    showToast("الموقع الجغرافي غير متوفر لهذا السجل", "error");
  }
};

/**
 * 4. أدوات التحقق والتعامل مع المستخدم (UX Helpers)
 */

export const isValidSudanesePhone = (phone: string) => {
  const regex = /^(249[19]\d{8}|0[19]\d{8})$/;
  if (!regex.test(phone)) {
    showToast("رقم الهاتف غير صحيح (ابدأ بـ 249 أو 09)", "error");
    return false;
  }
  return true;
};

export const runSafe = async (setLoading: (val: boolean) => void, callback: () => Promise<any>) => {
  if (typeof window !== "undefined" && !window.navigator.onLine) {
    showToast("لا يوجد اتصال بالإنترنت", "error");
    return;
  }
  setLoading(true);
  try {
    await callback();
  } catch (error) {
    console.error("Execution Error:", error);
  } finally {
    setLoading(false);
  }
};

export const formatSDG = (amount: number) => {
  return new Intl.NumberFormat('ar-SD', {
    style: 'currency',
    currency: 'SDG',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const contactWhatsApp = (phone: string, message: string = "") => {
  let cleanPhone = phone.replace(/\D/g, ''); 
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '249' + cleanPhone.substring(1);
  }
  
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};
