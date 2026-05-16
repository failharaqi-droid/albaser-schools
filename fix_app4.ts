import fs from 'fs';

function fixFile() {
  let content = fs.readFileSync('src/App.tsx', 'utf8');

  // Find something like:
  // <div
  //  }
  //  }
  //  }
  //  className=...
  
  content = content.replace(/<div\s+\}\s+\}\s+\}/g, '<div');
  content = content.replace(/<div\s+\}\s+\}/g, '<div');

  fs.writeFileSync('src/App.tsx', content, 'utf8');
}

fixFile();
