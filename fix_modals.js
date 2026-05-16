const fs = require('fs');

function processFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace backdrop and flex centering
  content = content.replace(/className="(fixed inset-0[^"]*)bg-(slate|gray|black)-[0-9]+\/[0-9]+[^"]*flex items-center justify-center[^"]*"/g, (match, p1) => {
    return 'className="' + p1 + 'bg-[#f8fafc] overflow-y-auto block"';
  });
  
  // also handle bg-black/60 backdrop-blur-md
  content = content.replace(/className="(fixed inset-0[^"]*)bg-(black|slate|gray)\/[0-9]+ backdrop-blur[^"]*flex items-center justify-center[^"]*"/g, (match, p1) => {
    return 'className="' + p1 + 'bg-[#f8fafc] overflow-y-auto block"';
  });

  // Replace motion.div container constraints
  // Change rounded to rounded-none (or keep a big container), remove max-h-[90vh], remove shadow-2xl
  content = content.replace(/className="([^"]*)max-h-\[(80|90)vh\]([^"]*)"/g, (match, p1, p2, p3) => {
    let newClass = (p1 + p3).replace(/rounded-\[[^\]]+\]/g, '').replace(/rounded-[a-z0-9]+/g, '').replace(/shadow-2xl/g, 'shadow-sm').replace(/overflow-hidden/g, '').replace(/max-w-[a-zA-Z0-9\[\]\-]+/g, 'max-w-7xl mx-auto min-h-screen my-0');
    return 'className="' + newClass + ' min-h-screen"';
  });

  // some containers have custom heights or overflow hidden without max-h-90vh
  // let's look for modal inner containers more generically
  content = content.replace(/className="([^"]*)w-full max-w-4xl([^"]*)bg-white([^"]*)rounded-\[[^\]]+\]([^"]*)"/g, (match, p1, p2, p3, p4) => {
    if (match.includes('max-h-')) return match; // already handled
    let newClass = match.replace(/rounded-\[[^\]]+\]/g, '').replace(/shadow-2xl/g, 'shadow-sm').replace(/max-w-4xl/g, 'max-w-7xl mx-auto min-h-screen my-0');
    return newClass;
  });

  // Remove animate-in fade-in from modals if any
  content = content.replace(/initial=\{\{ opacity: 0[^}]*\}\}/g, '');
  content = content.replace(/animate=\{\{ opacity: 1[^}]*\}\}/g, '');
  content = content.replace(/exit=\{\{ opacity: 0[^}]*\}\}/g, '');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
}

const files = require('child_process').execSync('find src -name "*.tsx"').toString().split('\n').filter(Boolean);
files.forEach(processFile);
