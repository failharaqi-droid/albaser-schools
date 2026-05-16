import fs from 'fs';

function fixPortals(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // We are looking for blocks starting with <AnimatePresence>\s+{condition ? createPortal(
  // and ending with , document.body) : null}\s+</AnimatePresence>
  // This can be done with a regex or programmatically
  
  const regex = /<AnimatePresence>\s*\{([A-Za-z0-9_]+(\s*&&\s*[A-Za-z0-9_]+)?)\s*\?\s*createPortal\(\s*([\s\S]*?)\s*,\s*document\.body\)\s*:\s*null\}\s*<\/AnimatePresence>/g;

  content = content.replace(regex, (match, condition, p2, innerHtml) => {
    return `{createPortal(
        <AnimatePresence>
          {${condition} && (
            ${innerHtml}
          )}
        </AnimatePresence>
        , document.body)}`;
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed', filePath);
}

fixPortals('src/components/StudentManager.tsx');
fixPortals('src/App.tsx');
