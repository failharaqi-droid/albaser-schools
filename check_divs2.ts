import fs from 'fs';

const content = fs.readFileSync('src/components/StudentManager.tsx', 'utf8');

// remove comments
const clean = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');

const divOpens = clean.match(/<div[\s>]/g)?.length || 0;
const divSelfClose = clean.match(/<div[^>]*\/>/g)?.length || 0;
const divCloses = clean.match(/<\/div>/g)?.length || 0;

console.log('divOpens:', divOpens, 'divSelfClose:', divSelfClose, 'divCloses:', divCloses);
