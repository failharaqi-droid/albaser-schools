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

      // 1. the ones with initial={{ x: '100%' }}
      const regex1 = /<div\s+className="fixed\s+inset-0\s+z-\[(\d+)\]\s+bg-white\s+flex\s+flex-col\s+overflow-hidden">\s+<motion\.div\s+(key="[^"]+"\s+)?initial=\{\{\s*x:\s*'100%'\s*\}\}\s+animate=\{\{\s*x:\s*0\s*\}\}\s+exit=\{\{\s*x:\s*'100%'\s*\}\}\s+(?:transition=\{[^}]+\}\s+)?className="flex-1\s+flex\s+flex-col\s+h-full\s+bg-white\s+relative\s+z-10([^"]*)"\s*>/g;

      // 2. also for `y: '100%'` (might want drawer from bottom?)
      // We will change y: '100%' modals into bottom sheets OR keep them as full overlays if they are "Receipt" etc. Wait, the user specifically mentioned "النوافذ الجانبية" (side windows). So we only need to fix x: '100%'.

      let modified = false;
      let newContent = content.replace(regex1, (match, zIndex, keyAttrStr, extraClasses) => {
        modified = true;
        const keyString = keyAttrStr ? `${keyAttrStr}` : '';
        // If there's a transition block, we shouldn't lose it if it was there, but my regex might eat it.
        // Let's make a simpler replace that builds on string operations or robust regex.
        return null;
      });
    }
  }
}
