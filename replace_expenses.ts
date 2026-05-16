import fs from 'fs';

let data = fs.readFileSync('src/components/ExpensesManager.tsx', 'utf8');

const regex = /<div className="p-10 border-b border-slate-100 flex items-center justify-between bg-white relative z-50 sticky top-0 shadow-sm px-12">[\s\S]*?<div className="flex-1 overflow-y-auto custom-scrollbar p-12 lg:p-24 bg-slate-50\/20">/m;

const replacement = `<div className="p-10 lg:p-12 border-b border-gray-100 flex items-center justify-between bg-white relative z-50 sticky top-0 shadow-sm overflow-hidden">
                <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-gradient-to-br from-red-50 to-orange-50 rounded-full blur-[80px] -mr-40 -mt-40 pointer-events-none opacity-60" />
                
                <div className="flex items-center gap-8 text-right relative z-20">
                  <div className="bg-gradient-to-br from-red-500 to-red-700 p-6 rounded-[2rem] text-white shadow-2xl shadow-red-200/50 flex items-center justify-center group-hover:scale-105 transition-transform">
                    {editingExpense ? <Edit2 className="w-10 h-10" /> : <Plus className="w-10 h-10" />}
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-gray-900 tracking-tight leading-relaxed">{editingExpense ? 'تعديل سجل الصرف المالي' : 'تسجيل مصروفات تشغيلية جديدة'}</h3>
                    <p className="text-sm font-bold text-gray-500 mt-2">تسجيل بيانات النفقات وإدارتها بما يضمن دقة التقارير المالية</p>
                  </div>
                </div>
                <button 
                  onClick={resetForm} 
                  className="p-5 bg-gray-50 hover:bg-red-50 rounded-[2rem] transition-all text-gray-400 hover:text-red-500 border border-gray-100 relative z-20"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-16 bg-gray-50/50">`;

if (regex.test(data)) {
  data = data.replace(regex, replacement);
  fs.writeFileSync('src/components/ExpensesManager.tsx', data);
  console.log('Replaced successfully');
} else {
  console.log('Regex not found');
}
