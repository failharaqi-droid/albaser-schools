import fs from 'fs';
import path from 'path';

function fixAllSidePanels(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixAllSidePanels(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');

      let modified = false;

      // 1. Change the wrapper: flex justify-start -> flex items-center justify-center p-4
      const wrapperRegex = /className="fixed inset-0\s+z-\[(\d+)\]\s+bg-slate-900\/60\s+backdrop-blur-sm\s+flex\s+justify-start\s+overflow-hidden"/g;
      
      content = content.replace(wrapperRegex, (match, zIndex) => {
        modified = true;
        return `className="fixed inset-0 z-[${zIndex}] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"`;
      });

      // 2. Change the motion.div:
      // initial={{ x: '100%' }} -> initial={{ opacity: 0, scale: 0.95 }}
      // animate={{ x: 0 }} -> animate={{ opacity: 1, scale: 1 }}
      // exit={{ x: '100%' }} -> exit={{ opacity: 0, scale: 0.95 }}
      // className="w-full max-w-2xl h-full bg-white relative z-10 shadow-2xl flex flex-col" -> className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] relative z-10 flex flex-col shadow-2xl overflow-hidden" (or similar depending on what exists)
      
      const motionRegex = /initial=\{\{\s*x:\s*'100%'\s*\}\}\s*animate=\{\{\s*x:\s*0\s*\}\}\s*exit=\{\{\s*x:\s*'100%'\s*\}\}\s*className="w-full max-w-2xl h-full bg-white relative z-10 shadow-2xl flex flex-col([^"]*)"/g;
      
      content = content.replace(motionRegex, (match, extraClasses) => {
        modified = true;
        return `initial={{ opacity: 0, scale: 0.95 }}\n              animate={{ opacity: 1, scale: 1 }}\n              exit={{ opacity: 0, scale: 0.95 }}\n              className="w-full max-w-4xl max-h-[90vh] bg-white rounded-[2rem] relative z-10 shadow-2xl flex flex-col overflow-hidden${extraClasses}"`;
      });

      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated to centered modal: ${fullPath}`);
      }
    }
  }
}

fixAllSidePanels('src/');
