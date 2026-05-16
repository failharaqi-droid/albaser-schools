import fs from 'fs';
import { execSync } from 'child_process';

function processFile(file: string) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Cleanup broken motion.div replacements
  content = content.replace(/pointer-events-none"\}\}\}/g, 'pointer-events-none"');
  content = content.replace(/pointer-events-none"\}\}/g, 'pointer-events-none"');
  content = content.replace(/"\}\}\}/g, '"');
  content = content.replace(/'\}\}\}/g, '\'');
  content = content.replace(/`\}\}\}/g, '`');
  
  content = content.replace(/"\}\}/g, '"');
  content = content.replace(/'\}\}/g, '\'');
  content = content.replace(/`\}\}/g, '`');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed syntax in', file);
  }
}

const files = execSync('find src -name "*.tsx"').toString().split('\n').filter(Boolean);
files.forEach(processFile);
