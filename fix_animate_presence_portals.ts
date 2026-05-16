import fs from 'fs';
import { execSync } from 'child_process';

const files = execSync('find src -name "*.tsx"').toString().split('\n').filter(Boolean);
for (let file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  content = content.replace(/\{createPortal\(\s*\{([^}]+)\}\s*,\s*document\.body/g, '{createPortal($1, document.body');
  content = content.replace(/\{createPortal\(\s*\{/g, '{createPortal(');
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Fixed ', file);
  }
}
