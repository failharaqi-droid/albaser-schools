import fs from 'fs';
import { execSync } from 'child_process';

function processFile(file: string) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  content = content.replace(/<div\s*\}\}\}/g, '<div');
  content = content.replace(/<div\s*\}\}/g, '<div');
  content = content.replace(/key=\{[^\}]+\}\}\}/g, (match) => match.replace(/\}\}\}/, '}'));
  content = content.replace(/key=\{[^\}]+\}\}/g, (match) => match.replace(/\}\}/, '}'));
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
  }
}

const files = execSync('find src -name "*.tsx"').toString().split('\n').filter(Boolean);
files.forEach(processFile);
