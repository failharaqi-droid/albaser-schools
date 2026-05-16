import fs from 'fs';

const data = fs.readFileSync('src/components/StudentManager.tsx', 'utf8');

const { parse } = require('@babel/parser');

try {
  parse(data, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  console.log('Babel parsed successfully!');
} catch (e: any) {
  console.error(e.message, 'at line', e.loc.line, 'col', e.loc.column);
}
