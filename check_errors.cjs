const fs = require('fs');
const errors = fs.readFileSync('errors2.txt', 'utf8').split('\n');

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
    console.log(`Failed at ${file} ${line+1} : ${lines ? lines[line] : ''}`);
  }
});
