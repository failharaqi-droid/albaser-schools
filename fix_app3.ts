import fs from 'fs';

function fixFile() {
  let content = fs.readFileSync('src/App.tsx', 'utf8');

  content = content.replace(/\)\}\n\s*,\s*document\.body\)\}/g, '), document.body)}');

  fs.writeFileSync('src/App.tsx', content, 'utf8');
}

fixFile();
