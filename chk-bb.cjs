const fs = require('fs');
let lines = fs.readFileSync('src/components/BackgroundBot.tsx', 'utf8').split('\n');
let count = 0;
for (let i = 0; i < lines.length; i++) {
  for (let c of lines[i]) {
    if (c === '{') count++;
    if (c === '}') count--;
  }
}
console.log('BackgroundBot open count:', count);
