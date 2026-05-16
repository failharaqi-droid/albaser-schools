import fs from 'fs';
let data = fs.readFileSync('node_replace.ts', 'utf8');

const divStarts = (data.match(/<div[^>]*>/g) || []).length;
const divEnds = (data.match(/<\/div>/g) || []).length;

console.log('div', divStarts, divEnds);
