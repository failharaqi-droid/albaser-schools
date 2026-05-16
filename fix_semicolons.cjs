const fs = require('fs');
const execSync = require('child_process').execSync;

const out = execSync('grep -n -l "^;$" src/components/*.tsx').toString().trim().split('\n');

for (const file of out) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\n;\n/g, "\n    }\n  };\n");
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed semicolons in', file);
}
