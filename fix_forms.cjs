const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('src', function(filePath) {
  if (filePath.endsWith('.tsx') && filePath.includes('components')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    let original = content;

    // Convert "overflow-y-auto custom-scrollbar p-8 lg:p-12 bg-gray-50/50" to match PaymentModal (flex-1 flex flex-col items-center justify-center p-10 bg-slate-50)
    // Wait, some pages aren't centered forms. They are lists.
    // Let's just make sure all form wrappers are max-w-5xl
    content = content.replace(/className="max-w-3xl w-full /g, 'className="max-w-5xl w-full ');
    content = content.replace(/className="max-w-4xl mx-auto"/g, 'className="max-w-5xl mx-auto w-full"');
    content = content.replace(/className="max-w-3xl mx-auto /g, 'className="max-w-5xl mx-auto w-full /');
    content = content.replace(/className="max-w-4xl mx-auto /g, 'className="max-w-5xl mx-auto w-full /');
    content = content.replace(/className="max-w-2xl mx-auto"/g, 'className="max-w-5xl mx-auto w-full"');
    content = content.replace(/className="max-w-xl mx-auto"/g, 'className="max-w-5xl mx-auto w-full"');

    // Make all flex-1 container have w-full and be centered nicely
    content = content.replace(/className="flex-1 overflow-y-auto custom-scrollbar /g, 'className="flex-1 overflow-y-auto custom-scrollbar w-full ');
    content = content.replace(/className="flex-1 overflow-y-auto p-12 lg:p-24 /g, 'className="flex-1 overflow-y-auto p-12 lg:p-24 custom-scrollbar w-full ');

    if (original !== content) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    }
  }
});
