const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processContent(content) {
  let newContent = content;

  // Since inputs shouldn't have text-lg when they are tiny (min-h-[38px])
  newContent = newContent.replace(/font-bold text-lg transition-all text-right shadow-sm placeholder:text-slate-300/g, 'font-bold text-sm transition-all text-right shadow-sm placeholder:text-slate-300');
  newContent = newContent.replace(/font-bold text-lg transition-all shadow-sm/g, 'font-bold text-sm transition-all shadow-sm');
  
  // Actually, any `text-lg` after `px-3 py-1.5` should be `text-sm`
  newContent = newContent.replace(/px-3 py-1\.5 min-h-\[38px\] outline-none focus:ring-2 focus:ring-slate-900 font-bold text-lg/g, 'px-3 py-1.5 min-h-[38px] outline-none focus:ring-2 focus:ring-slate-900 font-bold text-sm');

  // Also some general text-lg inside borders
  newContent = newContent.replace(/font-black text-lg transition-all/g, 'font-black text-sm transition-all');

  return newContent;
}

const filesToProcess = ['src/components', 'src/App.tsx'];

filesToProcess.forEach(target => {
  if (fs.statSync(target).isDirectory()) {
    walkDir(target, processFile);
  } else {
    processFile(target);
  }
});

function processFile(filePath) {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = processContent(content);

    if (original !== content) {
        fs.writeFileSync(filePath, content);
        console.log(`Fixed fonts in ${filePath}`);
    }
  }
}
