"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Loader2 } from "lucide-react";

export default function CombinedStatsPage() {
  const [stats, setStats] = useState({
    contract: { activeRevenue: 0, pendingRevenue: 0, activeCount: 0, pendingCount: 0, completedContractsCount: 0, cancelledCount: 0, ratings: { ممتاز: 0, جيد: 0, سيئ: 0 } },
    single: { totalCompleted: 0, totalPending: 0, countCompleted: 0, countPending: 0, countCancelled: 0, ratings: { ممتاز: 0, جيد: 0, سيئ: 0 } }
  });

  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [loading, setLoading] = useState(true);

  const fetchData = async (start?: string, end?: string) => {
    setLoading(true);
    try {
      const contractsSnap = await getDocs(collection(db, "contracts"));
      const bookingsSnap = await getDocs(collection(db, "bookings"));

      let activeRev = 0, pendRev = 0, activeC = 0, pendC = 0, compContracts = 0, cancC = 0;
      let cRateCounts = { ممتاز: 0, جيد: 0, سيئ: 0 };

      for (const doc of contractsSnap.docs) {
        const data = doc.data();
        if (data.type !== "monthly_contract" && data.category !== "monthly_contract") continue;
        if (data.status === "cancelled") { cancC++; continue; }

        const contractDate = data.contractStartDate?.toDate ? data.contractStartDate.toDate() : new Date();
        const dateStr = contractDate.toISOString().split('T')[0];
        const isWithinRange = (!start || !end) || (dateStr >= start && dateStr <= end);

        if (isWithinRange) {
          const price = parseFloat(data.finalPrice?.replace(/[^0-9.]/g, '') || "0");
          const visitsSnap = await getDocs(collection(doc.ref, "visits"));
          const visitsCount = visitsSnap.size;
          visitsSnap.forEach((v) => {
            const vData = v.data();
            if (vData.rating === "ممتاز") cRateCounts["ممتاز"]++;
            else if (vData.rating === "جيد") cRateCounts["جيد"]++;
            else if (vData.rating === "سيئ") cRateCounts["سيئ"]++;
          });

          if (visitsCount >= 12) { compContracts++; activeRev += price; activeC++; }
          else if (visitsCount > 0) { activeRev += price; activeC++; }
          else { pendRev += price; pendC++; }
        }
      }

      let sCompRev = 0, sPendRev = 0, sCompC = 0, sPendC = 0, sCancC = 0;
      let sRateCounts = { ممتاز: 0, جيد: 0, سيئ: 0 };
      
      bookingsSnap.forEach((doc) => {
        const data = doc.data();
        const price = parseFloat(data.price) || 0;
        if (data.rating) {
            if (data.rating === "ممتاز") sRateCounts["ممتاز"]++;
            else if (data.rating === "جيد") sRateCounts["جيد"]++;
            else if (data.rating === "سيئ") sRateCounts["سيئ"]++;
        }
        if (data.status === "completed") { sCompRev += price; sCompC++; }
        else if (data.status === "pending") { sPendRev += price; sPendC++; }
        else if (data.status === "cancelled") { sCancC++; }
      });

      setStats({
        contract: { activeRevenue: activeRev, pendingRevenue: pendRev, activeCount: activeC, pendingCount: pendC, completedContractsCount: compContracts, cancelledCount: cancC, ratings: cRateCounts },
        single: { totalCompleted: sCompRev, totalPending: sPendRev, countCompleted: sCompC, countPending: sPendC, countCancelled: sCancC, ratings: sRateCounts }
      });
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (dateRange.start && dateRange.end) fetchData(dateRange.start, dateRange.end); }, [dateRange]);

  const RatingCard = ({ title, ratings }: { title: string, ratings: any }) => (
    <div className="bg-white p-6 rounded-[30px] border border-gray-100 shadow-sm mt-4">
        <h3 className="font-black text-sm mb-4">{title}</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-green-50 rounded-2xl"><p className="text-[9px] font-black text-green-700">ممتاز</p><span className="text-lg font-black">{ratings["ممتاز"]}</span></div>
            <div className="p-3 bg-blue-50 rounded-2xl"><p className="text-[9px] font-black text-blue-700">جيد</p><span className="text-lg font-black">{ratings["جيد"]}</span></div>
            <div className="p-3 bg-red-50 rounded-2xl"><p className="text-[9px] font-black text-red-700">سيئ</p><span className="text-lg font-black">{ratings["سيئ"]}</span></div>
        </div>
    </div>
  );

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen" dir="rtl">
      <h1 className="text-xl font-black mb-6">لوحة الإحصائيات الشاملة 📊</h1>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="space-y-8">
          {/* قسم العقود */}
          <section>
            <h2 className="text-sm font-black text-gray-700 mb-4">العقود الشهرية</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white p-5 rounded-[30px] border border-indigo-100"><p className="text-[10px] text-indigo-400 font-black">المكتملة</p><h2 className="text-lg font-black text-indigo-600">{stats.contract.completedContractsCount}</h2></div>
                <div className="bg-white p-5 rounded-[30px] border border-red-100"><p className="text-[10px] text-red-400 font-black">الملغاة</p><h2 className="text-lg font-black text-red-600">{stats.contract.cancelledCount}</h2></div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white p-5 rounded-[30px] border border-green-100"><p className="text-[10px] text-gray-400 font-black">دخل النشطة ({stats.contract.activeCount})</p><h2 className="text-lg font-black text-green-600">{stats.contract.activeRevenue.toLocaleString()}</h2></div>
                <div className="bg-white p-5 rounded-[30px] border border-amber-100"><p className="text-[10px] text-gray-400 font-black">دخل المعلقة ({stats.contract.pendingCount})</p><h2 className="text-lg font-black text-amber-600">{stats.contract.pendingRevenue.toLocaleString()}</h2></div>
            </div>
            <RatingCard title="تقييم زيارات العقود" ratings={stats.contract.ratings} />
          </section>

          <hr />

          {/* قسم الزيارات */}
          <section>
            <h2 className="text-sm font-black text-gray-700 mb-4">الزيارات المفردة (العابرة)</h2>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-[30px] border border-blue-100"><p className="text-[10px] text-gray-400 font-black">الدخل المحقق</p><h2 className="text-lg font-black text-blue-600">{stats.single.totalCompleted.toLocaleString()}</h2></div>
                <div className="bg-white p-5 rounded-[30px] border border-orange-100"><p className="text-[10px] text-gray-400 font-black">الدخل المتوقع</p><h2 className="text-lg font-black text-orange-600">{stats.single.totalPending.toLocaleString()}</h2></div>
            </div>
            <div className="bg-white p-4 rounded-[30px] border border-gray-100 mt-4 text-xs font-bold text-gray-600">
                المكتملة: {stats.single.countCompleted} | المعلقة: {stats.single.countPending} | الملغاة: {stats.single.countCancelled}
            </div>
            <RatingCard title="تقييم الزيارات المفردة" ratings={stats.single.ratings} />
          </section>

          <hr className="border-t-4 border-slate-300" />

          {/* التقرير التجميعي */}
          <section className="bg-slate-800 p-6 rounded-[40px] text-white">
            <h2 className="text-sm font-black mb-6">التقرير التجميعي (العقود + الزيارات)</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-700 p-5 rounded-[30px]"><p className="text-[10px] text-slate-300 font-black">إجمالي الدخل المحقق</p><h2 className="text-xl font-black">{(stats.contract.activeRevenue + stats.single.totalCompleted).toLocaleString()}</h2></div>
                <div className="bg-slate-700 p-5 rounded-[30px]"><p className="text-[10px] text-slate-300 font-black">إجمالي الدخل المتوقع</p><h2 className="text-xl font-black">{(stats.contract.pendingRevenue + stats.single.totalPending).toLocaleString()}</h2></div>
            </div>
            <RatingCard 
                title="إجمالي تقييمات المنصة" 
                ratings={{
                    "ممتاز": stats.contract.ratings["ممتاز"] + stats.single.ratings["ممتاز"],
                    "جيد": stats.contract.ratings["جيد"] + stats.single.ratings["جيد"],
                    "سيئ": stats.contract.ratings["سيئ"] + stats.single.ratings["سيئ"]
                }} 
            />
          </section>
        </div>
      )}
    </div>
  );
}
