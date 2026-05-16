import fs from 'fs';

let data = fs.readFileSync('src/components/InvestorManager.tsx', 'utf8');

const oldHeaderStr = `          {/* Statistics Sidebar */}
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:scale-150"></div>
              <div className="relative space-y-4">
                <div className="bg-blue-100 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-600">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-gray-500 font-bold mb-1">إجمالي المسلم (للشهر المحدد)</p>
                  <h3 className="text-3xl font-black text-blue-600 tracking-tight">
                    {formatCurrency(filteredPayments.reduce((sum, p) => sum + p.amount, 0))}
                  </h3>
                </div>
                <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-sm">
                  <span className="text-gray-400 font-bold">عدد العمليات:</span>
                  <span className="font-black text-gray-900">{filteredPayments.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-8 rounded-[2rem] text-white shadow-xl shadow-emerald-100">
              <div className="space-y-4">
                <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-emerald-100 font-bold mb-1">صافي الإيرادات بعد الاستلام</p>
                  <h3 className="text-3xl font-black tracking-tight">قيد التطوير</h3>
                  <p className="text-xs text-emerald-200 mt-2 italic">يتم الربط مع الميزانية العامة تلقائياً</p>
                </div>
              </div>
            </div>`;

const newHeaderStr = `          {/* Statistics Sidebar */}
          <div className="space-y-8">
            <div className="bg-white p-8 lg:p-10 rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-100/50 relative overflow-hidden group transition-all hover:shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/60 rounded-full blur-[80px] -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-150"></div>
              <div className="relative space-y-8">
                <div className="flex justify-between items-start">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-700 w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shadow-blue-200">
                    <TrendingDown className="w-8 h-8" />
                  </div>
                  <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-black border border-blue-100">الشهر المحدد</div>
                </div>
                <div className="space-y-2">
                  <p className="text-gray-400 font-bold text-sm tracking-widest uppercase mb-1">إجمالي المبالغ المسلمة</p>
                  <h3 className="text-5xl font-black text-gray-900 tracking-tighter" dir="rtl">
                    {formatCurrency(filteredPayments.reduce((sum, p) => sum + p.amount, 0))}
                  </h3>
                </div>
                <div className="p-5 bg-gray-50 rounded-[1.5rem] border border-gray-100 flex items-center justify-between">
                  <span className="text-gray-400 font-black text-sm">العمليات المسجلة</span>
                  <span className="font-black text-gray-900 text-lg bg-white px-4 py-1.5 rounded-lg shadow-sm border border-gray-200">{filteredPayments.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-8 lg:p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-300 rounded-full blur-[80px] -ml-32 -mt-32 opacity-50 transition-transform duration-1000 group-hover:translate-x-10 group-hover:translate-y-10"></div>
              <div className="relative space-y-8">
                <div className="flex justify-between items-start">
                  <div className="bg-white text-emerald-600 w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div className="bg-emerald-800/40 text-emerald-50 px-4 py-2 rounded-xl text-xs font-black backdrop-blur-md">ارتباط ديناميكي</div>
                </div>
                <div className="space-y-2">
                  <p className="text-emerald-100 font-bold text-sm tracking-widest uppercase mb-1">صافي الإيرادات</p>
                  <h3 className="text-4xl font-black tracking-tight">قيد التطوير</h3>
                </div>
                <div className="p-4 bg-emerald-800/30 rounded-[1.5rem] backdrop-blur-md border border-emerald-400/20 text-center text-sm text-emerald-50 font-bold leading-relaxed">
                  هذه الخوارزمية ستقوم باحتساب صافي الأرباح تلقائياً بعد خصم المبالغ المسلمة للمستثمر.
                </div>
              </div>
            </div>`;

if (data.includes(oldHeaderStr)) {
  data = data.replace(oldHeaderStr, newHeaderStr);
  fs.writeFileSync('src/components/InvestorManager.tsx', data);
  console.log('Replaced successfully');
} else {
  console.log('String not found');
}
