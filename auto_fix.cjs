const fs = require('fs');
const errors = fs.readFileSync('errors.txt', 'utf8').split('\n');

const changes = {};

errors.forEach(err => {
  const match = err.match(/(src\/components\/[^:]+?\.tsx)\((\d+),(\d+)\): (error TS1128|error TS1005)/);
  if (match) {
    const file = match[1];
    const line = parseInt(match[2], 10) - 1; // 0-indexed
    const col = parseInt(match[3], 10);
    const errType = match[4];
    
    if (!changes[file]) changes[file] = {};
    changes[file][line] = errType;
  }
});

for (const file in changes) {
  if (!fs.existsSync(file)) continue;
  let lines = fs.readFileSync(file, 'utf8').split('\n');
  let fileChanged = false;
  
  for (const lineStr in changes[file]) {
    const l = parseInt(lineStr, 10);
    if (lines[l]) {
      // Check if it's an isolated `);` or `,` that's broken
      if (lines[l].trim() === ');') {
         lines[l] = lines[l].replace(');', '    });');
         fileChanged = true;
      }
    }
  }
  
  if (fileChanged) {
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    console.log('Fixed lines in', file);
  }
}
