"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { doc, onSnapshot } from "firebase/firestore";
import { usePathname } from "next/navigation";

export default function FloatingWhatsApp() {
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    // جلب الرقم لحظياً من الفايربيس
    const unsub = onSnapshot(doc(db, "settings", "contact"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setWhatsappNumber(data.whatsapp || "");
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching WhatsApp number:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const isAdminPage = pathname?.includes("admin");

  if (isAdminPage || !whatsappNumber || loading) return null;

  return (
    <a 
      href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`} 
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-28 left-6 z-[9999] bg-[#25D366] text-white w-9 h-9 rounded-full shadow-[0_5px_15px_rgba(0,0,0,0.15)] flex items-center justify-center border border-white active:scale-90 hover:scale-105 transition-all duration-300"
      aria-label="WhatsApp"
    >
      {/* أيقونة واتساب بحجم مصغر متناسق مع الدائرة الجديدة */}
      <svg 
        viewBox="0 0 24 24" 
        width="18" 
        height="18" 
        fill="currentColor"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .004 5.412.001 12.048c0 2.12.553 4.189 1.602 6.04L0 24l6.102-1.6c1.785.973 3.8 1.487 5.944 1.488h.005c6.634 0 12.043-5.414 12.046-12.051a11.811 11.811 0 00-3.476-8.513z" />
      </svg>
    </a>
  );
}
