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

    // Clean up extreme padding and border radius on inputs
    content = content.replace(/rounded-\[2\.2rem\]/g, 'rounded-2xl');
    content = content.replace(/rounded-\[1\.8rem\]/g, 'rounded-xl');
    content = content.replace(/pr-16 pl-8 py-6/g, 'pr-12 pl-6 py-4 text-lg');
    content = content.replace(/px-8 py-6/g, 'px-6 py-4 text-lg');
    content = content.replace(/focus:ring-8/g, 'focus:ring-2');
    
    // Clean up X close buttons that were large
    content = content.replace(/p-6 bg-slate-50 hover:bg-rose-50 rounded-\[2\.2rem\] transition-all text-slate-300 hover:text-rose-500 border border-slate-50/g, 'p-4 bg-slate-50 hover:bg-rose-50 rounded-2xl transition-all text-slate-400 hover:text-rose-600 border border-slate-50 active:scale-95');

    // Make modals more unified
    content = content.replace(/p-10 lg:p-20/g, 'p-8 lg:p-10');

    if (original !== content) {
        fs.writeFileSync(filePath, content);
        console.log(`Cleaned padding in ${filePath}`);
    }
  }
});
