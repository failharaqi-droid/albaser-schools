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
    // Replace the problematic classes
    content = content.replace(/className="modal-content !max-w-3xl"/g, 'className="modal-content"');
    content = content.replace(/className="modal-content text-center p-12 flex-1 justify-center items-center"/g, 'className="modal-content"');
    content = content.replace(/className="modal-content !max-w-2xl text-center p-12"/g, 'className="modal-content"');
    content = content.replace(/className="modal-content !max-w-\[600px\] overflow-hidden flex flex-col h-full bg-\[#f8fafc\]"/g, 'className="modal-content"');
    content = content.replace(/className="modal-content !max-w-4xl"/g, 'className="modal-content"');
    
    if (original !== content) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    }
  }
});
