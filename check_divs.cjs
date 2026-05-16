const fs = require('fs');

const content = fs.readFileSync('src/components/StudentManager.tsx', 'utf8');
const lines = content.split('\n');

let divCount = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Exclude comments or self-closing divs if any
  const opens = (line.match(/<div/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  
  // Note: this is extremely naive, doesn't handle strings properly, but good enough for a quick trace
  divCount += opens;
  divCount -= closes;
  
  if (divCount < 0) {
    console.log(`Negative div count at line ${i+1}: ${line}`);
  }
}
console.log('Final div count: ', divCount);
