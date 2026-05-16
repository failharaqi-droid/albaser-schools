import fs from 'fs';

let data = fs.readFileSync('src/components/StaffManager.tsx', 'utf8');

const regex = /<div className="p-10 border-b border-slate-100 flex items-center justify-between bg-white relative z-20 sticky top-0 shadow-sm px-10">[\s\S]*?<form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">/m;

const replacement = `<div className="p-10 lg:p-12 border-b border-gray-100 flex items-center justify-between bg-white relative z-20 sticky top-0 shadow-sm overflow-hidden">
                <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-[80px] -mr-40 -mt-40 pointer-events-none opacity-60" />

                <div className="flex items-center gap-8 text-right relative z-20">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-[2rem] text-white shadow-2xl shadow-blue-200/50 flex items-center justify-center">
                    <UserPlus className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-gray-900 tracking-tight leading-relaxed">{editingStaff ? 'تحديث سجل بيانات الموظف' : 'إضافة عضو جديد للكادر'}</h3>
                    <p className="text-sm font-bold text-gray-500 mt-2">تسجيل بيانات الموظفين الأساسية بدقة لاضافتها لسجلات المدرسة</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 relative z-20">
                  <button 
                    onClick={resetForm} 
                    className="p-5 bg-gray-50 hover:bg-rose-50 rounded-[2rem] transition-all text-gray-400 hover:text-rose-600 border border-gray-100"
                  >
                    <X className="w-8 h-8" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">`;

if (regex.test(data)) {
  data = data.replace(regex, replacement);
  fs.writeFileSync('src/components/StaffManager.tsx', data);
  console.log('Replaced successfully');
} else {
  console.log('Regex not found');
}
