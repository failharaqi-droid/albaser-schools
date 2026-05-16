const fs = require('fs');

async function run() {
  const tscOut = fs.readFileSync('errors_latest.txt', 'utf8').split('\n');
  const changes = {};

  tscOut.forEach(err => {
    // Match line and col
    const match = err.match(/(src\/components\/[^:]+?\.tsx)\((\d+),(\d+)\): error (TS1005|TS1381|TS1382|TS1128|TS1472)/);
    if (match) {
       const file = match[1];
       const line = parseInt(match[2], 10) - 1; // 0 index
       const errCode = match[4];
       if (!changes[file]) changes[file] = {};
       changes[file][line] = errCode;
    }
  });

  for (const file in changes) {
    if (!fs.existsSync(file)) continue;
    let lines = fs.readFileSync(file, 'utf8').split('\n');
    let changed = false;

    // We process top-down or bottom-up
    for (const lineStr in changes[file]) {
       const l = parseInt(lineStr, 10);
       const err = changes[file][l];
       
       // If the line has `});` and error is 1005, 1381, 1382, 1472, 1128
       // wait, let's just replace `});` with `);` on that exact line if it has `});`
       if (lines[l] && lines[l].includes('});')) {
           lines[l] = lines[l].replace('});', ');');
           changed = true;
       } 
       // what if the error is reported on the line AFTER `});` ?
       // TS sometimes reports on the next line if the current block is confused
       else if (lines[l-1] && lines[l-1].includes('});')) {
           lines[l-1] = lines[l-1].replace('});', ');');
           changed = true;
       }
       else if (lines[l-2] && lines[l-2].includes('});')) {
           lines[l-2] = lines[l-2].replace('});', ');');
           changed = true;
       }
    }

    if (changed) {
       fs.writeFileSync(file, lines.join('\n'), 'utf8');
       console.log('Smart fixed in', file);
    }
  }
}

run();
