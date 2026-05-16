const fs = require('fs');
const lines = fs.readFileSync('src/components/PaymentProcessor.tsx', 'utf8').split('\n');

let open = 0;
for (let i = 0; i < lines.length; i++) {
  let lineOpen = 0;
  for (let j = 0; j < lines[i].length; j++) {
    if (lines[i][j] === '{') lineOpen++;
    if (lines[i][j] === '}') lineOpen--;
  }
  open += lineOpen;
  
  if (open > 0 && lineOpen > 0) {
     // it's normal to have open > 0, but let's just dump the cumulative
     // Actually let's dump where line starts a big block
  }
}
console.log('Final open:', open);
