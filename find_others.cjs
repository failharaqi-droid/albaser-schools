const fs = require('fs');

const files = [
  'src/components/AttendanceManager.tsx',
  'src/components/BackgroundBot.tsx',
  'src/components/PaymentModal.tsx',
  'src/components/IDCardManager.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let lines = fs.readFileSync(file, 'utf8').split('\n');
  
  let stack = [];
  let inString = false;
  let stringChar = '';
  let inComment = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let j = 0;
    while (j < line.length) {
      const c = line[j];
      const next = line[j+1];
      
      if (!inString && !inComment) {
        if (c === '/' && next === '/') {
          break; // skip rest of line
        }
        if (c === '/' && next === '*') {
          inComment = true;
          j++;
        } else if (c === '"' || c === "'" || c === "`") {
          inString = true;
          stringChar = c;
        } else if (c === '{') {
          stack.push({ char: '{', line: i + 1 });
        } else if (c === '}') {
          if (stack.length && stack[stack.length - 1].char === '{') {
            stack.pop();
          } else {
            // unmatched }
             stack.push({ char: '}', line: i + 1 });
          }
        } else if (c === '(') {
          stack.push({ char: '(', line: i + 1 });
        } else if (c === ')') {
          if (stack.length && stack[stack.length - 1].char === '(') {
            stack.pop();
          } else {
             stack.push({ char: ')', line: i + 1 });
          }
        }
      } else if (inString) {
        if (c === '\\') {
          j++; // skip escaped char
        } else if (c === stringChar) {
          inString = false;
        }
      } else if (inComment) {
        if (c === '*' && next === '/') {
          inComment = false;
          j++;
        }
      }
      j++;
    }
  }
  console.log(`\n============ ${file} ============`);
  const missing = stack.slice(-10);
  console.log(`Stack size: ${stack.length}`);
  console.log(missing.map(s => `${s.char} at line ${s.line}`).join('\n'));
}
