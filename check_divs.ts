import fs from 'fs';
const content = fs.readFileSync('src/components/StudentManager.tsx', 'utf8');
const lines = content.split('\n');
let open = 0;
for(let i=0; i<lines.length; i++) {
  const line = lines[i];
  const o = (line.match(/<div(?=[\s>])/g) || []).length;
  // also check for self-closing <div ... />
  const s = (line.match(/<div[^>]*\/>/g) || []).length;
  const c = (line.match(/<\/div>/g) || []).length;
  open += o - s - c;
  if(open < 0) {
     console.log(`Warning: negative open divs at line ${i+1}`);
     open = 0; // reset to avoid cascading
  }
}
console.log('Final open divs:', open);
