"use client";

interface ServiceSelectionProps {
  onNext: (type: string) => void;
}

export default function ServiceSelection({ onNext }: ServiceSelectionProps) {
  return (
    <div className="flex flex-col items-center p-4 bg-gray-50 min-h-[40vh] text-right" dir="rtl">
      <h2 className="text-2xl font-bold text-blue-900 mb-8 border-b-2 border-blue-200 pb-2">اختر نوع الخدمة</h2>
      
      <div className="grid grid-cols-1 gap-5 w-full max-w-md">
        
        {/* خيار الزيارة المنفردة */}
        <button 
          onClick={() => onNext("single")}
          className="bg-white border-2 border-blue-50 p-6 rounded-2xl shadow-sm hover:border-blue-500 hover:shadow-md transition-all flex justify-between items-center group active:scale-95"
        >
          <div className="flex-1 text-right">
            <h3 className="font-bold text-lg text-gray-800">حجز زيارة منفردة</h3>
            <p className="text-sm text-gray-500 mt-1">خدمة نظافة شاملة لمرة واحدة (4 ساعات)</p>
          </div>
          <div className="text-2xl font-bold text-blue-600 mr-4">←</div>
        </button>

        {/* خيار الزيارة المتعددة */}
        <button 
          onClick={() => onNext("multi")}
          className="bg-white border-2 border-blue-50 p-6 rounded-2xl shadow-sm hover:border-blue-500 hover:shadow-md transition-all flex justify-between items-center group active:scale-95"
        >
          <div className="flex-1 text-right">
            <h3 className="font-bold text-lg text-gray-800">حجز زيارة متعددة</h3>
            <p className="text-sm text-gray-500 mt-1">نظام تعاقدات مرن (شهري، شهرين، 3 أشهر)</p>
          </div>
          <div className="text-2xl font-bold text-blue-600 mr-4">←</div>
        </button>

      </div>

      <p className="text-xs text-gray-400 mt-10 text-center italic">
        * جميع خدماتنا تضمن لك أعلى معايير الجودة والأمان
      </p>
    </div>
  );
}
