import fs from 'fs';

function fixFile() {
  let content = fs.readFileSync('src/App.tsx', 'utf8');

  content = content.replace(/\n\s*\}\n\s*\}\n\s*onClick/g, '\n                  onClick');

  fs.writeFileSync('src/App.tsx', content, 'utf8');
}

fixFile();
