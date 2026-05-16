import fs from 'fs';
let txt = fs.readFileSync('src/App.tsx', 'utf8');
let openBraces = (txt.match(/\{/g) || []).length;
let closeBraces = (txt.match(/\}/g) || []).length;
console.log('App.tsx:', openBraces, closeBraces, openBraces - closeBraces);

function findImbalance() {
  let count = 0;
  let lines = txt.split('\n');
  for(let i=0; i<lines.length; i++) {
    for(let char of lines[i]) {
      if (char === '{') count++;
      if (char === '}') count--;
    }
  }
}
findImbalance();
