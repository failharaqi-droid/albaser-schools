const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('src/components', function(filePath) {
  if (filePath.endsWith('.tsx') && !filePath.includes('PaymentModal')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Convert giant action buttons
    content = content.replace(/w-full max-w-xl theme-bg text-white py-8 rounded-\[3\.5rem\] font-black text-2xl text-slate-900 tracking-tight theme-shadow shadow-2xl hover:scale-\[1\.02\] active:scale-\[0\.98\] transition-all/g, 'w-full px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95');
    
    // Convert multiple variations of it
    content = content.replace(/theme-bg text-white py-8 rounded-\[3(?:\.5)?rem\] font-black text-2xl text-slate-900 tracking-tight theme-shadow shadow-2xl/g, 'bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20');
    content = content.replace(/theme-bg text-white py-[68] rounded-\[.+?\] font-black.+?theme-shadow shadow-2xl/g, 'bg-slate-900 text-white py-4 px-6 rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20');
    
    // Fix huge buttons like "إتمام التسجيل" or "حفظ التغييرات"
    content = content.replace(/className="w-full bg-slate-900 text-white py-8 rounded-\[3\.5rem\] font-black text-3xl hover:bg-slate-800 transition-all shadow-2xl"/g, 'className="w-full px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95"');
    
    // Drop massive rounded-[4.5rem] on forms
    content = content.replace(/rounded-\[4\.5rem\]/g, 'rounded-3xl');
    content = content.replace(/rounded-\[4rem\]/g, 'rounded-3xl');
    content = content.replace(/rounded-\[3\.5rem\]/g, 'rounded-2xl');
    content = content.replace(/rounded-\[3rem\]/g, 'rounded-2xl');
    
    // Convert primary color buttons to sleeker slate ones
    content = content.replace(/bg-blue-600 text-white py-6 rounded-\[2rem\] font-black text-xl hover:bg-blue-700 shadow-xl shadow-blue-100/g, 'bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 shadow-xl shadow-slate-900/20');
    content = content.replace(/bg-emerald-600 text-white py-6 rounded-2xl font-black text-xl hover:bg-emerald-700 shadow-xl shadow-emerald-200/g, 'bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 shadow-xl shadow-emerald-600/20');
    content = content.replace(/bg-rose-50 text-rose-600 px-8 py-6 rounded-2xl font-black/g, 'bg-rose-50 text-rose-600 px-6 py-4 rounded-2xl font-bold');
    
    // Reduce massive padding on form containers
    content = content.replace(/p-12 lg:p-20/g, 'p-8');
    content = content.replace(/p-10 lg:p-12/g, 'p-8');

    if (original !== content) {
        fs.writeFileSync(filePath, content);
        console.log(`Shrunk buttons in ${filePath}`);
    }
  }
});
