"use client";

import React from 'react';

// القائمة المحدثة: الآن الـ name يطابق الـ id تماماً لضمان الوضوح والمطابقة مع Firebase
const professions = [
  { id: "كهربائي", name: "كهربائي", icon: "⚡" },
  { id: "سباك (مواسيرجي)", name: "سباك (مواسيرجي)", icon: "🚰" },
  { id: "فني تكييف وتبريد", name: "فني تكييف وتبريد", icon: "❄️" },
  { id: "توصيل طلبات (ركشة/موتر)", name: "توصيل طلبات (ركشة/موتر)", icon: "🛵" },
  { id: "ممرض / ممرضة", name: "ممرض / ممرضة", icon: "🩺" },
  { id: "فني غسالات", name: "فني غسالات", icon: "🧺" },
  { id: "ميكانيكي", name: "ميكانيكي", icon: "🔧" },
  { id: "عامل مساعد", name: "عامل مساعد", icon: "🧹" },
  { id: "نقاش (بويجي)", name: "نقاش (بويجي)", icon: "🎨" },
  { id: "نجار", name: "نجار", icon: "🪚" },
  { id: "فني ستالايت (دش)", name: "فني ستالايت (دش)", icon: "📡" },
  { id: "مبلط (سيراميك)", name: "مبلط (سيراميك)", icon: "🧱" },
  { id: "حداد", name: "حداد", icon: "⚒️" },
  { id: "بناء", name: "بناء", icon: "🏗️" },
  { id: "مساعد بناء (طُلبة)", name: "مساعد بناء (طُلبة)", icon: "🧱" },
  { id: "طباخ", name: "طباخ", icon: "👨‍🍳" },
  { id: "حلاق (خدمة منزلية)", name: "حلاق (خدمة منزلية)", icon: "✂️" },
  { id: "غسيل عربات", name: "غسيل عربات", icon: "🚿" },
];

interface ServiceSelectionProps {
  onSelectService: (service: string) => void;
}

export default function ServiceSelection({ onSelectService }: ServiceSelectionProps) {
  return (
    <div className="p-4 bg-gray-50 min-h-screen" dir="rtl">
      {/* رأس الصفحة */}
      <div className="mb-8 mt-4 text-center">
        <h1 className="text-2xl font-black text-gray-900 mb-2">منو المحتاج ليهو؟ ✨</h1>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">اختر الحرفة لنريك الأقرب إليك</p>
      </div>

      {/* شبكة الحرفيين */}
      <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
        {professions.map((service) => (
          <button
            key={service.id}
            onClick={() => onSelectService(service.id)} // إرسال الـ id المطابق للبيانات
            className="flex flex-col items-center justify-center p-4 bg-white rounded-3xl border border-gray-100 shadow-sm active:scale-90 active:bg-gray-50 transition-all group"
          >
            <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">
              {service.icon}
            </span>
            {/* النص الآن يظهر بالكامل كما هو في الـ ID */}
            <span className="text-[10px] font-black text-gray-800 text-center leading-tight">
              {service.name}
            </span>
          </button>
        ))}
      </div>

      {/* رسالة توضيحية بسيطة */}
      <div className="mt-10 text-center opacity-50">
        <p className="text-[11px] font-bold text-gray-600">جميع الحرفيين في نطاق 20 كيلومتر</p>
      </div>
    </div>
  );
}
