"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ShieldCheck, Clock, CreditCard, UserCheck, AlertTriangle } from "lucide-react";

export default function ContractPage({ orderData }: any) {
  const router = useRouter();
  const [hasAccepted, setHasAccepted] = useState(false);

  // تم تثبيت عدد الساعات هنا ليكون 5 ساعات بشكل دائم
  const data = orderData || {
    id: "RAHA-77291",
    fullName: "إبراهيم عبدالله",
    selectedDays: ["السبت", "الاثنين", "الأربعاء"],
    totalHours: 5, // القيمة الثابتة الجديدة
    price: "15,000",
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans" dir="rtl">
      {/* Header */}
      <div className="bg-[#1E293B] text-white p-6 rounded-b-[40px] shadow-lg mb-6">
        <button onClick={() => router.back()} className="mb-4 flex items-center gap-1 text-slate-400 text-xs">
          <ChevronRight size={16} /> العودة للطلب
        </button>
        <h1 className="text-2xl font-black italic">عقد خدمة "راحة" ✨</h1>
        <p className="text-slate-400 text-[10px] mt-1 font-bold">رقم الوثيقة الرقمية: {data.id}</p>
      </div>

      <div className="px-6 max-w-2xl mx-auto space-y-4">
        
        {/* القسم الأول: الإشراف الرقمي */}
        <section className="bg-white p-5 rounded-[30px] shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-3 text-blue-600">
            <UserCheck size={20} />
            <h2 className="font-black text-sm">نظام الإشراف والتايمر</h2>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
            يبدأ حساب الوقت رسمياً فقط عندما يضغط **المشرف** على زر <span className="text-blue-600 font-black">(بدء العمل)</span> في تطبيقه، وينتهي عند ضغطه على <span className="text-blue-600 font-black">(إنهاء العمل)</span>. التايمر الرقمي هو المرجع الوحيد لحساب ساعاتك.
          </p>
        </section>

        {/* القسم الثاني: الخصوصية */}
        <section className="bg-red-50 p-5 rounded-[30px] border border-red-100">
          <div className="flex items-center gap-2 mb-3 text-red-600">
            <ShieldCheck size={20} />
            <h2 className="font-black text-sm">الخصوصية والأمان (خط أحمر)</h2>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-900 font-bold leading-relaxed">
                يُمنع منعاً باتاً ترك العاملة بمفردها مع (رجال) في حال غياب سيدة المنزل.
              </p>
            </div>
            <div className="flex gap-2">
              <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-900 font-bold leading-relaxed">
                يحق للمشرف سحب العاملة فوراً وإلغاء الزيارة إذا تبين له مخالفة بند الخصوصية، وتُحتسب الزيارة مدفوعة بالكامل.
              </p>
            </div>
          </div>
        </section>

        {/* القسم الثالث: الحقوق المالية */}
        <section className="bg-white p-5 rounded-[30px] shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-3 text-emerald-600">
            <CreditCard size={20} />
            <h2 className="font-black text-sm">الحقوق المالية والتعويضات</h2>
          </div>
          <ul className="text-[11px] text-slate-600 space-y-2 font-medium">
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
              ضمان التلفيات: يجب إبلاغ المشرف بأي ضرر ناتج عن إهمال قبل مغادرته للموقع للتوثيق والتعويض.
            </li>
          </ul>
        </section>

        {/* ملخص المواعيد - يظهر الآن 5H ثابتة */}
        <div className="bg-blue-600 p-6 rounded-[35px] text-white flex justify-between items-center shadow-lg shadow-blue-200">
          <div className="space-y-1">
            <p className="text-[10px] opacity-80 font-bold">أيام الخدمة المجدولة:</p>
            <p className="text-xs font-black italic">{data.selectedDays.join(" - ")}</p>
          </div>
          <div className="text-left">
            <p className="text-[10px] opacity-80 font-bold">إجمالي ساعات الزيارة:</p>
            <p className="text-lg font-black italic">5H</p> 
          </div>
        </div>

        {/* الموافقة والاعتماد */}
        <div className="pt-6 space-y-4">
          <label className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 active:bg-slate-50 cursor-pointer">
            <input 
              type="checkbox" 
              checked={hasAccepted}
              onChange={() => setHasAccepted(!hasAccepted)}
              className="w-5 h-5 rounded-md accent-blue-600" 
            />
            <span className="text-[10px] font-black text-slate-500 leading-tight italic">
              أقر بأنني قرأت كافة البنود وأوافق على نظام (التايمر الرقمي) وإشراف (المشرف الميداني) كمرجع لتنفيذ العقد.
            </span>
          </label>

          <button
            disabled={!hasAccepted}
            className={`w-full py-5 rounded-[30px] font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2 ${
              hasAccepted 
              ? 'bg-[#1E293B] text-white active:scale-95 shadow-blue-200' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            توقيع العقد والدفع ({data.price} ج.س) 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
