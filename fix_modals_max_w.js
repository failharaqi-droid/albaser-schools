import fs from 'fs';
import path from 'path';

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
    content = content.replace(/className="modal-content [^"]*max-w-[^"]*"/g, 'className="modal-content"');
    content = content.replace(/className="modal-content [^"]*"/g, (match) => {
        if (match.includes("!max-w") || match.includes("max-w")) {
            return 'className="modal-content"';
        }
        return match;
    });

    if (original !== content) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    }
  }
});
