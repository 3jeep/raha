"use client";

import { useState } from 'react';
import ServiceSelection from '@/components/ServiceSelection';
import MapView from '@/components/MapView';
import { useRouter } from 'next/navigation';

// تأكد أن هذه القائمة مطابقة تماماً للقوائم في الصفحات الأخرى
const professionsList = [
  "كهربائي",
  "سباك (مواسيرجي)",
  "فني تكييف وتبريد",
  "توصيل طلبات (ركشة/موتر)",
  "ممرض / ممرضة",
  "فني غسالات",
  "ميكانيكي",
  "عامل مساعد",
  "نقاش (بويجي)",
  "نجار",
  "فني ستالايت (دش)",
  "مبلط (سيراميك)",
  "حداد",
  "بناء",
  "مساعد بناء (طُلبة)",
  "طباخ",
  "حلاق (خدمة منزلية)",
  "غسيل عربات"
];

export default function HandymanPage() {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {!selectedService ? (
        // المرحلة الأولى: اختيار الحرفة
        <>
          <div className="flex-1">
            {/* تأكد أن مكون ServiceSelection يستخدم المصفوفة المحدثة أعلاه */}
            <ServiceSelection 
              professions={professionsList} 
              onSelectService={(service) => setSelectedService(service)} 
            />
          </div>
          
          <div className="p-6 bg-gray-50">
            <button 
              onClick={() => router.push('/handymen/manage')}
              className="w-full max-w-md mx-auto block bg-white border-2 border-dashed border-gray-300 p-4 rounded-2xl text-center active:scale-95 transition-all shadow-sm"
            >
              <p className="text-sm font-black text-gray-800">هل أنت صاحب حرفة؟ 🛠️</p>
              <p className="text-[10px] font-bold text-blue-600 mt-1">انقر هنا لإضافة حرفتك والظهور على الخريطة</p>
            </button>
          </div>
        </>
      ) : (
        // المرحلة الثانية: الخريطة بعد الاختيار
        <div className="relative h-screen w-full">
          {/* زر الرجوع لتغيير الحرفة بتصميم متناسق */}
          <button 
            onClick={() => setSelectedService(null)}
            className="absolute top-4 right-4 z-50 bg-white/90 backdrop-blur-md text-black px-6 py-3 rounded-2xl shadow-2xl font-black text-xs border border-gray-100 active:scale-95 transition-all"
            dir="rtl"
          >
            ↩️ تغيير الحرفة ({selectedService})
          </button>
          
          <MapView serviceType={selectedService} />
        </div>
      )}
    </div>
  );
}
