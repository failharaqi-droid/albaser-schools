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

  // Ultra compress vertical spacings in forms and lists
  newContent = newContent.replace(/space-y-8/g, 'space-y-3');
  newContent = newContent.replace(/space-y-6/g, 'space-y-3');
  newContent = newContent.replace(/space-y-5/g, 'space-y-2');
  newContent = newContent.replace(/space-y-4/g, 'space-y-2');
  newContent = newContent.replace(/space-y-3/g, 'space-y-2'); // extremely small
  
  newContent = newContent.replace(/gap-8/g, 'gap-3');
  newContent = newContent.replace(/gap-6/g, 'gap-3');
  newContent = newContent.replace(/gap-5/g, 'gap-3');
  newContent = newContent.replace(/gap-4/g, 'gap-2');
  
  // Padding compressions
  newContent = newContent.replace(/p-8/g, 'p-4');
  newContent = newContent.replace(/p-6/g, 'p-4');
  newContent = newContent.replace(/lg:p-6/g, 'lg:p-5');
  newContent = newContent.replace(/lg:p-8/g, 'lg:p-5');

  // Input paddings even smaller
  newContent = newContent.replace(/px-4 py-2\.5/g, 'px-3 py-1.5 min-h-[38px]');
  newContent = newContent.replace(/px-6 py-4/g, 'px-3 py-1.5 min-h-[38px]');
  newContent = newContent.replace(/px-4 py-3/g, 'px-3 py-1.5 min-h-[38px]');
  newContent = newContent.replace(/py-4/g, 'py-2');
  
  // Reduce massive text elements
  newContent = newContent.replace(/text-3xl/g, 'text-xl');
  newContent = newContent.replace(/text-2xl/g, 'text-lg');

  // Reduce some icons
  newContent = newContent.replace(/w-16 h-16/g, 'w-10 h-10');
  newContent = newContent.replace(/w-12 h-12/g, 'w-8 h-8');
  newContent = newContent.replace(/w-8 h-8/g, 'w-6 h-6');

  // Eliminate large empty paddings at the bottom
  newContent = newContent.replace(/pb-12/g, 'pb-6');
  newContent = newContent.replace(/pb-10/g, 'pb-4');
  newContent = newContent.replace(/pb-8/g, 'pb-4');

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
  if (filePath.endsWith('.tsx')) { // don't ignore PaymentModal anymore
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = processContent(content);

    if (original !== content) {
        fs.writeFileSync(filePath, content);
        console.log(`Ultra-compressed spacing in ${filePath}`);
    }
  }
}
