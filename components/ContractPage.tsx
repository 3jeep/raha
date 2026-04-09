"use client";
import { useState } from "react";

export default function ContractPage({ onAccept }: { onAccept: () => void }) {
  const [isChecked, setIsChecked] = useState(false);
  const [error, setError] = useState("");

  const handleProceed = () => {
    if (!isChecked) {
      setError("الرجاء الموافقة على الشروط للمتابعة.");
    } else {
      onAccept();
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 text-right">
      <h2 className="text-xl font-bold mb-4 text-blue-900">إتفاقية تقديم الخدمة</h2>
      
      <div className="bg-gray-50 p-4 rounded-xl h-48 overflow-y-auto text-sm text-gray-600 mb-6 leading-relaxed border">
        <p className="mb-2">1. يلتزم الطرف الأول (شركة راحة) بتوفير العمالة المنزلية المدربة.</p>
        <p className="mb-2">2. يلتزم العميل بتوفير بيئة عمل آمنة للعاملة.</p>
        <p className="mb-2">3. مدة الزيارة المنفردة 4 ساعات عمل فعلية.</p>
        <p className="mb-2">4. في نظام التعاقدات، يتم تجديد العقد تلقائياً ما لم يطلب العميل الإلغاء.</p>
        <p>5. يقر العميل بمسؤوليته عن صحة البيانات المدخلة في المنصة.</p>
      </div>

      <div className="flex items-center gap-3 mb-6 justify-end">
        <label htmlFor="agree" className="text-sm font-bold text-gray-700 cursor-pointer">
          أوافق على جميع الشروط والأحكام
        </label>
        <input 
          id="agree"
          type="checkbox" 
          className="w-5 h-5 accent-blue-600"
          checked={isChecked}
          onChange={(e) => setIsChecked(e.target.checked)}
        />
      </div>

      {error && <p className="text-red-500 text-xs mb-4">{error}</p>}

      <button 
        onClick={handleProceed}
        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100"
      >
        الموافقة والمتابعة
      </button>
    </div>
  );
}
