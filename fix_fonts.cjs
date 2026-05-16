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
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Fix fonts in inputs/forms
    content = content.replace(/(<input[^>]*className="[^"]*)text-lg([^"]*")/g, '$1text-sm$2');
    content = content.replace(/(<select[^>]*className="[^"]*)text-lg([^"]*")/g, '$1text-sm$2');
    content = content.replace(/(<textarea[^>]*className="[^"]*)text-lg([^"]*")/g, '$1text-sm$2');

    // Make labels slightly smaller and closer
    content = content.replace(/label className="text-sm/g, 'label className="text-xs');
    content = content.replace(/label className="text-lg/g, 'label className="text-sm');

    if (original !== content) {
        fs.writeFileSync(filePath, content);
    }
  }
});
