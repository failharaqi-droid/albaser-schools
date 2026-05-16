import fs from 'fs';
import { execSync } from 'child_process';

function processFile(file: string) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Let's strip initial, animate, exit, layout, variants inside modals.
  // A simple way is to match <motion.div\s+initial=[\s\S]*?className="([^"]*(max-w-4xl|min-h-screen|max-w-5xl)[^"]*)"
  content = content.replace(/<motion\.div\s(?:[\s\S]*?)className="([^"]*(min-h-screen|max-h-\[(80|90)vh\]|max-w-(4xl|5xl))[^"]*)"/g, (match, p1) => {
     let newM = match;
     newM = newM.replace(/<motion\.div/, '<div');
     newM = newM.replace(/\s*initial=\{[^}]*\}/g, '');
     newM = newM.replace(/\s*animate=\{[^}]*\}/g, '');
     newM = newM.replace(/\s*exit=\{[^}]*\}/g, '');
     newM = newM.replace(/\s*variants=\{[\s\S]*?\}\}/g, '');
     newM = newM.replace(/\s*layout\s/g, ' ');
     // Remove any remaining ` }}` if we had double braces.
     newM = newM.replace(/initial=\{[^}]*}\}/g, '');
     newM = newM.replace(/animate=\{[^}]*}\}/g, '');
     newM = newM.replace(/exit=\{[^}]*}\}/g, '');
     
     // More greedy removal for props that span multiple lines
     newM = newM.replace(/\s*initial=\{\{[\s\S]*?\}\}/g, '');
     newM = newM.replace(/\s*animate=\{\{[\s\S]*?\}\}/g, '');
     newM = newM.replace(/\s*exit=\{\{[\s\S]*?\}\}/g, '');
     newM = newM.replace(/\s*transition=\{\{[\s\S]*?\}\}/g, '');
     return newM;
  });

  // Since we replaced <motion.div with <div, we need to carefully replace </motion.div> for those.
  // A safe way globally if we don't know which one was closed is:
  // Actually, we can just replace ALL `</motion.div>` if they are right after the min-h-screen div. But how?
  // Let's just do a global replace if there's no `<motion.div` opened?
  // That's unsafe. Let's do a regex that finds `<motion.div` and matches its block.
  // Actually, the easiest is to just use a sed-like pattern. But since we have nested motion.divs, it's safer to just replace all `initial={...}` everywhere where it forms a modal. Let's just do a more targeted text replace.

  if(content.includes('min-h-screen') || content.includes('overflow-y-auto block')) {
     // Let's just strip 'initial={{ opacity: 0...' out of any tags that have min-h-screen or are inside our modals
     const modalStarts = [
       /initial=\{\{ opacity: 0, scale: 0\.95 \}\}/g,
       /animate=\{\{ opacity: 1, scale: 1 \}\}/g,
       /exit=\{\{ opacity: 0, scale: 0\.95 \}\}/g,
       /initial=\{\{ opacity: 0, y: 20 \}\}/g,
       /animate=\{\{ opacity: 1, y: 0 \}\}/g,
       /exit=\{\{ opacity: 0, y: 20 \}\}/g,
       /initial=\{\{ opacity: 0 \}\}/g,
       /animate=\{\{ opacity: 1 \}\}/g,
       /exit=\{\{ opacity: 0 \}\}/g,
     ];
     modalStarts.forEach(r => content = content.replace(r, ''));
     
     // Also replace <motion.div with <div and </motion.div> with </div> IF they are modal containers
     // We replaced initial, animate, exit so they are just `<motion.div className="..." >`
     content = content.replace(/<motion\.div\s+className="([^"]*min-h-screen[^"]*)"/g, '<div className="$1"');
     // But wait, the closing tag won't match if we just look at the opening.
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
}

const files = execSync('find src -name "*.tsx"').toString().split('\n').filter(Boolean);
files.forEach(processFile);
