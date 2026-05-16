import fs from 'fs';
import { execSync } from 'child_process';

function processFile(file: string) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  content = content.replace(/<([a-zA-Z0-9]+)\s+(?:\}\s+)+\s*(className=|onClick=|style=)/g, '<$1 $2');
  content = content.replace(/<div\s+\}\s+className/g, '<div className');
  content = content.replace(/<div\s+\}\s+\}\s+className/g, '<div className');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed syntax in', file);
  }
}

const files = execSync('find src -name "*.tsx"').toString().split('\n').filter(Boolean);
files.forEach(processFile);
