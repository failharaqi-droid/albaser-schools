import fs from 'fs';

const path = 'src/components/StudentManager.tsx';
let data = fs.readFileSync(path, 'utf8');

const divStarts = (data.match(/<div[^>]*>/g) || []).length;
const divEnds = (data.match(/<\/div>/g) || []).length;

const motionStarts = (data.match(/<motion\.div[^>]*>/g) || []).length;
const motionEnds = (data.match(/<\/motion\.div>/g) || []).length;

console.log('div', divStarts, divEnds);
console.log('motion.div', motionStarts, motionEnds);
