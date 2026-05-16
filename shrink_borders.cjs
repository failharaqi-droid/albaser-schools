const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
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
  if (filePath.endsWith('.tsx') && !filePath.includes('PaymentModal')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.replace(/rounded-\[2\.5rem\]/g, 'rounded-2xl');
    content = content.replace(/rounded-\[2rem\]/g, 'rounded-2xl');
    content = content.replace(/rounded-\[1\.5rem\]/g, 'rounded-xl');
    content = content.replace(/rounded-\[1\.8rem\]/g, 'rounded-xl');

    if (original !== content) {
        fs.writeFileSync(filePath, content);
        console.log(`Cleaned borders ${filePath}`);
    }
  }
}
