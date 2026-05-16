import fs from 'fs';
import { execSync } from 'child_process';

function processFile(file: string) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace backdrop and flex centering
  // e.g. fixed inset-0 z-[250] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4
  content = content.replace(/className="(fixed inset-0[^"]*)bg-(slate|gray|black)-[0-9]+\/[0-9]+[^"]*flex items-center justify-center[^"]*"/g, (match, p1) => {
    return 'className="' + p1 + 'bg-[#f8fafc] overflow-y-auto block"';
  });
  
  // also handle bg-black/60 backdrop-blur-md
  content = content.replace(/className="(fixed inset-0[^"]*)bg-(black|slate|gray)\/[0-9]+ backdrop-blur[^"]*flex items-center justify-center[^"]*"/g, (match, p1) => {
    return 'className="' + p1 + 'bg-[#f8fafc] overflow-y-auto block"';
  });

  // some might not have backdrop-blur
  content = content.replace(/className="(fixed inset-0[^"]*)flex items-center justify-center p-4"/g, (match, p1) => {
    return 'className="' + p1 + 'bg-[#f8fafc] overflow-y-auto block"';
  });

  // Replace motion.div container constraints
  // Change rounded to rounded-none (or keep a big container), remove max-h-[90vh], remove shadow-2xl
  content = content.replace(/className="([^"]*)max-h-\[(80|90)vh\]([^"]*)"/g, (match, p1, p2, p3) => {
    let newClass = (p1 + p3).replace(/rounded-\[[^\]]+\]/g, '').replace(/rounded-[a-zA-Z0-9]+/g, '').replace(/shadow-2xl/g, 'shadow-sm').replace(/overflow-hidden/g, '').replace(/max-w-[a-zA-Z0-9\[\]\-]+/g, 'max-w-4xl mx-auto min-h-screen my-0');
    return 'className="' + newClass + ' min-h-screen"';
  });

  // For remaining w-full max-w-4xl ... 
  content = content.replace(/className="([^"]*)w-full max-w-(4xl|5xl|3xl|2xl)([^"]*)bg-white([^"]*)rounded-\[[^\]]+\]([^"]*)"/g, (match, p1, p2, p3, p4, p5) => {
    if (match.includes('min-h-screen')) return match; // already handled
    let newClass = match.replace(/rounded-\[[^\]]+\]/g, '').replace(/rounded-[a-zA-Z0-9]+/g, '').replace(/shadow-2xl/g, 'shadow-sm').replace(new RegExp(`max-w-${p2}`, 'g'), 'max-w-4xl mx-auto min-h-screen my-0');
    return newClass;
  });

  // Also StudentManager has "bg-white p-6 rounded-[2rem] relative z-10 shadow-2xl flex flex-col"
  // Just some more aggressive replacements for the modal containers
  content = content.replace(/className="([^"]*)max-h-\[90vh\]([^"]*)"/g, (match, p1, p2) => {
    return 'className="' + p1 + p2 + ' min-h-screen max-w-5xl mx-auto"';
  });

  // Find remaining `p-0 lg:p-10 overflow-hidden` modals
  content = content.replace(/className="(fixed inset-0[^"]*)flex items-center justify-center p-0 lg:p-10 overflow-hidden"/g, (match, p1) => {
    return 'className="' + p1 + 'bg-[#f8fafc] overflow-y-auto block p-0"';
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
}

const files = execSync('find src -name "*.tsx"').toString().split('\n').filter(Boolean);
files.forEach(processFile);
