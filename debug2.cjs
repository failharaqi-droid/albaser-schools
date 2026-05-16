const fs = require('fs');
const content = fs.readFileSync('src/components/PaymentProcessor.tsx', 'utf8');

const lines = content.split('\n');
let count = 0;
for(let i=0; i<lines.length; i++) {
  let prev = count;
  for(let j=0; j<lines[i].length; j++) {
    if(lines[i][j]==='{') count++;
    else if(lines[i][j]==='}') count--;
  }
}
console.log('Total:', count);
