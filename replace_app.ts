import fs from 'fs';

let data = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /<div className="p-10 border-b border-slate-100 flex items-center justify-between bg-white relative z-20 sticky top-0 shadow-sm">[\s\S]*?<div className="flex items-center gap-4">/m;

const replacement = `<div className="p-10 lg:p-12 border-b border-gray-100 flex items-center justify-between bg-white relative z-20 sticky top-0 shadow-sm overflow-hidden">
                <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-gradient-to-br from-indigo-50 to-blue-50 rounded-full blur-[80px] -mr-40 -mt-40 pointer-events-none opacity-60" />

                <div className="flex items-center gap-8 text-right relative z-20">
                  <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-[2rem] text-white shadow-2xl shadow-indigo-200/50 flex items-center justify-center">
                    <Settings className="w-10 h-10 animate-[spin_4s_linear_infinite]" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight leading-relaxed">إعدادات المدرسة والهوية</h2>
                    <p className="text-sm font-bold text-gray-500 mt-2">تهيئة وتكوين الروابط المرجعية وبيانات المؤسسة الأساسية</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 relative z-20">`;

if (regex.test(data)) {
  data = data.replace(regex, replacement);
  fs.writeFileSync('src/App.tsx', data);
  console.log('Replaced successfully');
} else {
  console.log('Regex not found');
}
