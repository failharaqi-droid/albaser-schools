const fs = require('fs');
const content = fs.readFileSync('src/components/StudentManager.tsx', 'utf8');

let brace = 0;
let paren = 0;

const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes('//')) continue;
  
  brace += (line.match(/\{/g) || []).length;
  brace -= (line.match(/\}/g) || []).length;
  
  paren += (line.match(/\(/g) || []).length;
  paren -= (line.match(/\)/g) || []).length;
  
  if (brace < 0 || paren < 0) {
    console.log(`Line ${i+1}: brace=${brace}, paren=${paren} - ${line}`);
    // reset to avoid cascading
    if (brace < 0) brace = 0;
    if (paren < 0) paren = 0;
  }
}
console.log('Final: brace=', brace, ' paren=', paren);
