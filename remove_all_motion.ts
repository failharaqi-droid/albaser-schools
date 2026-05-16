import fs from 'fs';
import { execSync } from 'child_process';

function processFile(file: string) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace <motion.xxx opening tags
  content = content.replace(/<motion\.([a-zA-Z0-9]+)/g, '<$1');
  
  // Replace </motion.xxx> closing tags, though we already replaced </motion.div> with </div> earlier
  content = content.replace(/<\/motion\.([a-zA-Z0-9]+)>/g, '</$1>');

  // Strip motion props
  // We should be careful not to strip valid props.
  content = content.replace(/\sinitial=\{[^}]*\}/g, '');
  content = content.replace(/\sanimate=\{[^}]*\}/g, '');
  content = content.replace(/\sexit=\{[^}]*\}/g, '');
  content = content.replace(/\swhileHover=\{[^}]*\}/g, '');
  content = content.replace(/\swhileTap=\{[^}]*\}/g, '');
  content = content.replace(/\stransition=\{[^}]*\}/g, '');
  content = content.replace(/\slayoutId="[^"]*"/g, '');
  content = content.replace(/\slayout(\{.*\})?/g, '');
  content = content.replace(/\svariants=\{[^}]*\}/g, '');
  
  // Clean up any double braces left over
  content = content.replace(/\sinitial=\{\{[\s\S]*?\}\}/g, '');
  content = content.replace(/\sanimate=\{\{[\s\S]*?\}\}/g, '');
  content = content.replace(/\sexit=\{\{[\s\S]*?\}\}/g, '');
  content = content.replace(/\swhileHover=\{\{[\s\S]*?\}\}/g, '');
  content = content.replace(/\swhileTap=\{\{[\s\S]*?\}\}/g, '');
  content = content.replace(/\stransition=\{\{[\s\S]*?\}\}/g, '');
  content = content.replace(/\svariants=\{\{[\s\S]*?\}\}/g, '');
  
  content = content.replace(/<AnimatePresence[^>]*>/g, '');
  content = content.replace(/<\/AnimatePresence>/g, '');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
}

const files = execSync('find src -name "*.tsx"').toString().split('\n').filter(Boolean);
files.forEach(processFile);
