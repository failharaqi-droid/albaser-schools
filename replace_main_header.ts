import fs from 'fs';

let data = fs.readFileSync('src/components/InvestorManager.tsx', 'utf8');

const oldStr = `<div className="flex flex-wrap items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-xl shadow-blue-100">
            <TrendingDown className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">سجل تسليم المستثمر</h1>
            <p className="text-gray-500 font-bold">إدارة المبالغ المسلمة للمستثمر وتوثيقها</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-2xl">
            <button
              onClick={() => setViewType('electronic')}
              className={\`px-6 py-2 rounded-xl font-black transition-all \${
                viewType === 'electronic' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }\`}
            >
              سجل إلكتروني
            </button>
            <button
              onClick={() => setViewType('manual')}
              className={\`px-6 py-2 rounded-xl font-black transition-all \${
                viewType === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }\`}
            >
              سجل يدوي (دفتري)
            </button>
          </div>
          {canModify && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
            >
              <Plus className="w-5 h-5" />
              <span>إضافة تسليم جديد</span>
            </button>
          )}
        </div>
      </div>`;

const newStr = `<div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 bg-white p-8 lg:p-10 rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-100/50 relative overflow-hidden">
        {/* Decor */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-[60px] -ml-20 -mt-20 pointer-events-none" />

        <div className="flex items-center gap-6 relative z-10 text-right">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-[2rem] text-white shadow-2xl shadow-blue-200 group hover:scale-105 transition-transform duration-500">
            <TrendingDown className="w-10 h-10 group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-relaxed">سجل تسليم المستثمر</h1>
            <p className="text-gray-500 font-bold text-sm mt-1">إدارة المبالغ المسلمة للمستثمر وتوثيقها ببيانات آمنة ومشفرة</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10 w-full xl:w-auto">
          <div className="flex bg-gray-50 p-2 rounded-[1.5rem] border border-gray-100 shadow-inner w-full sm:w-auto">
            <button
              onClick={() => setViewType('electronic')}
              className={\`px-8 py-3.5 rounded-[1.2rem] font-black transition-all flex-1 sm:flex-none text-sm \${
                viewType === 'electronic' ? 'bg-white text-blue-700 shadow-md transform scale-100' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100 scale-95'
              }\`}
            >
              سجل إلكتروني
            </button>
            <button
              onClick={() => setViewType('manual')}
              className={\`px-8 py-3.5 rounded-[1.2rem] font-black transition-all flex-1 sm:flex-none text-sm \${
                viewType === 'manual' ? 'bg-white text-blue-700 shadow-md transform scale-100' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100 scale-95'
              }\`}
            >
              سجل يدوي (دفتري)
            </button>
          </div>
          {canModify && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center justify-center w-full sm:w-auto gap-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-10 py-4.5 rounded-[1.5rem] font-black hover:from-blue-700 hover:to-blue-800 transition-all shadow-xl shadow-blue-200 hover:-translate-y-1 active:translate-y-0 text-sm h-[60px]"
            >
              <Plus className="w-5 h-5 bg-white/20 rounded-full p-0.5" />
              <span>إضافة تسليم جديد</span>
            </button>
          )}
        </div>
      </div>`;

if (data.includes(oldStr)) {
  data = data.replace(oldStr, newStr);
  fs.writeFileSync('src/components/InvestorManager.tsx', data);
  console.log('Replaced successfully');
} else {
  console.log('String not found');
}
