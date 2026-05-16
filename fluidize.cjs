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
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    let original = content;

    // Convert fixed large max-widths to w-full so they become fluid up to the page margins
    content = content.replace(/max-w-\[1700px\]/g, 'w-full');
    content = content.replace(/max-w-\[1600px\]/g, 'w-full');
    content = content.replace(/max-w-\[1500px\]/g, 'w-full');
    content = content.replace(/max-w-7xl/g, 'w-full');
    content = content.replace(/max-w-6xl/g, 'w-full');

    if (original !== content) {
        fs.writeFileSync(filePath, content);
        console.log(`Fluidized ${filePath}`);
    }
  }
});
