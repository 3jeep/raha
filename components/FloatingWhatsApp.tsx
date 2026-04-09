"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; // تأكد من صحة مسار استيراد ملف الفايربيس
import { doc, onSnapshot } from "firebase/firestore";
import { usePathname } from "next/navigation";

export default function FloatingWhatsApp() {
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    // جلب الرقم لحظياً من الفايربيس
    // المسار: مجموعة settings -> وثيقة contact
    const unsub = onSnapshot(doc(db, "settings", "contact"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // الحقل اسمه whatsapp كما ذكرت
        setWhatsappNumber(data.whatsapp || "");
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching WhatsApp number:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // منع الظهور في صفحات الأدمن
  const isAdminPage = pathname?.includes("admin");

  // لا يظهر الزر إذا كنا في صفحة أدمن، أو إذا كان الرقم فارغاً، أو أثناء التحميل
  if (isAdminPage || !whatsappNumber || loading) return null;

  return (
    <a 
      href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`} 
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-28 left-6 z-[9999] bg-green-500 text-white px-5 py-3 rounded-full shadow-[0_10px_30px_rgba(34,197,94,0.4)] flex items-center gap-2 animate-bounce border-2 border-white active:scale-95 transition-all"
    >
      <div className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
      </div>
      <span className="text-[10px] font-black italic">تواصل معنا 💬</span>
    </a>
  );
}
