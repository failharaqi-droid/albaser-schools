import fs from 'fs';
import { execSync } from 'child_process';

function processFile(file: string) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Cleanup broken motion.div replacements
  content = content.replace(/<motion\.div\}\}\}/g, '<div');
  content = content.replace(/<motion\.div\}\}/g, '<div');
  content = content.replace(/<motion\.div\s*\}\}/g, '<div');
  content = content.replace(/<motion\.div\s*\}\}\}/g, '<div');
  content = content.replace(/<motion\.div\s*>\s*\}\}\}/g, '<div');
  content = content.replace(/<motion\.div\s+className=/g, '<div className=');
  // Just change any open <motion.div to <div if it's left over without animations
  // but wait, if it still has `variants` maybe we leave it? The task was to remove animated modals.
  // We can just replace `<motion.div` with `<div` and `</motion.div>` with `</div>` globally 
  // ONLY for the ones that were broken, or globally if we don't care.
  // Actually, fixing the broken syntax is exactly what we need.
  
  // also fix double closing
  content = content.replace(/<\/motion\.div>/g, '</div>');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed syntax in', file);
  }
}

const files = execSync('find src -name "*.tsx"').toString().split('\n').filter(Boolean);
files.forEach(processFile);
