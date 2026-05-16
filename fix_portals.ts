import fs from 'fs';
import { execSync } from 'child_process';

function processFile(file: string) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // React fragment wrap instead of AnimatePresence
  // Actually, since I ran content = content.replace(/<AnimatePresence[^>]*>/g, '') it just deleted the tag.
  // We can just add <> instead of nothing, but it's too late now.
  // Let's replace `{createPortal(\s*\{([^&]+)&& \(/g` with `{createPortal( $1 && (`
  
  content = content.replace(/\{createPortal\(\s*\{([a-zA-Z0-9_]+)\s*&&\s*\(/g, '{createPortal( $1 && (');
  // Also we need to delete the matching closing } before `, document.body`
  content = content.replace(/\)\},\s*document\.body\s*\)\}/g, ')), document.body)}');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed syntax in', file);
  }
}

const files = execSync('find src -name "*.tsx"').toString().split('\n').filter(Boolean);
files.forEach(processFile);
