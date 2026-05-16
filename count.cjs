const fs = require('fs');
const lines = fs.readFileSync('src/components/AttendanceManager.tsx', 'utf8').split('\n');
let count = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('});')) {
    count++;
  }
}
console.log(count);
