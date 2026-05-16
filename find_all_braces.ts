import fs from 'fs';
import { execSync } from 'child_process';

const files = execSync('find src -name "*.tsx"').toString().split('\n').filter(Boolean);

for (let file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\/\/.*$/gm, '');
  content = content.replace(/\/\*[\s\S]*?\*\//g, '');
  
  let o = (content.match(/\{/g) || []).length;
  let c = (content.match(/\}/g) || []).length;
  if (o !== c) {
    console.log(`${file}: open=${o}, close=${c}, diff=${o-c}`);
  }
}
