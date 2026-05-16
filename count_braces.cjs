const fs = require('fs');
const content = fs.readFileSync('src/components/PaymentProcessor.tsx', 'utf8');

let count = 0;
for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') count++;
  else if (content[i] === '}') count--;
}
console.log('Brace count status:', count);
