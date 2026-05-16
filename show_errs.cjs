const fs = require('fs');
const content = fs.readFileSync('errors2.txt', 'utf8').split('\n').filter(l => l.includes('error TS')).slice(0, 50).join('\n');
console.log(content);
