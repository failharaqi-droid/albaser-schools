const fs = require('fs');
const lines = fs.readFileSync('src/components/StudentManager.tsx', 'utf8').split('\n');

let d = 0;
for (let i = 1000; i < 1575; i++) {
  const line = lines[i];
  if (!line.includes('//')) {
    d += (line.match(/<div/g) || []).length;
    d -= (line.match(/<\/div>/g) || []).length;
  }
}
console.log(`Divs open before 1566: ${d}`);
