import fs from 'fs';
import path from 'path';

function fixSidepanels(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixSidepanels(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');

      let modified = false;

      // Find all overlay divs that wrap a side panel motion.div
      const overlayRegex = /<div\s+className="fixed\s+inset-0\s+z-\[(\d+)\]\s+bg-white([^"]*)">([^<]*)<motion\.div([\s\S]*?)className="flex-1\s+flex\s+flex-col\s+h-full\s+bg-white\s+relative\s+z-10([^"]*)"/g;

      content = content.replace(overlayRegex, (match, zIndex, overlayExtra, spaces, motionContent, motionExtraClasses) => {
        // Only modify if it's a side window (animating x: '100%')
        if (motionContent.includes("x: '100%'") || motionContent.includes('x: "100%"')) {
          modified = true;
          return `<div className="fixed inset-0 z-[${zIndex}] bg-slate-900/60 backdrop-blur-sm flex justify-start overflow-hidden">${spaces}<motion.div${motionContent}className="w-full max-w-2xl h-full bg-white relative z-10 shadow-2xl flex flex-col${motionExtraClasses}"`;
        }
        return match;
      });

      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Fixed side panels in ${fullPath}`);
      }
    }
  }
}

fixSidepanels('src/');
