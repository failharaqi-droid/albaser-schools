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

  // Decrease global huge spacings to avoid scrolling
  newContent = newContent.replace(/space-y-12/g, 'space-y-6');
  newContent = newContent.replace(/space-y-10/g, 'space-y-5');
  newContent = newContent.replace(/space-y-8/g, 'space-y-4');
  newContent = newContent.replace(/space-y-6/g, 'space-y-3');
  newContent = newContent.replace(/space-y-5/g, 'space-y-3');

  newContent = newContent.replace(/gap-12/g, 'gap-6');
  newContent = newContent.replace(/gap-10/g, 'gap-5');
  newContent = newContent.replace(/gap-8/g, 'gap-4');
  newContent = newContent.replace(/gap-6/g, 'gap-3');
  newContent = newContent.replace(/gap-5/g, 'gap-3');

  // Paddings
  newContent = newContent.replace(/p-12 lg:p-24/g, 'p-6 lg:p-8');
  newContent = newContent.replace(/p-12 lg:p-20/g, 'p-6 lg:p-8');
  newContent = newContent.replace(/p-10 lg:p-12/g, 'p-6 lg:p-8');
  newContent = newContent.replace(/p-8 lg:p-12/g, 'p-5 lg:p-6');
  
  newContent = newContent.replace(/p-12/g, 'p-6');
  newContent = newContent.replace(/p-10/g, 'p-6');
  newContent = newContent.replace(/p-8/g, 'p-5');

  // Input paddings
  newContent = newContent.replace(/px-6 py-4/g, 'px-4 py-2.5');
  newContent = newContent.replace(/px-12 py-5/g, 'px-8 py-3');
  newContent = newContent.replace(/min-h-\[60px\]/g, 'min-h-[44px]');
  newContent = newContent.replace(/min-h-\[50px\]/g, 'min-h-[44px]');

  // Reduce somewhat huge icons if any remain
  newContent = newContent.replace(/w-24 h-24/g, 'w-16 h-16');

  // Remove huge padding bottom that was used to push scroll
  newContent = newContent.replace(/pb-24/g, 'pb-12');
  newContent = newContent.replace(/pb-20/g, 'pb-10');

  return newContent;
}

walkDir('src/components', function(filePath) {
  if (filePath.endsWith('.tsx') && !filePath.includes('PaymentModal')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = processContent(content);

    if (original !== content) {
        fs.writeFileSync(filePath, content);
        console.log(`Compressed spacing in ${filePath}`);
    }
  }
});
