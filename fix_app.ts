import fs from 'fs';

function fixFile() {
  let content = fs.readFileSync('src/App.tsx', 'utf8');

  let lines = content.split('\n');
  if (lines[1089] && lines[1089].includes('</div>')) {
    lines[1089] = lines[1089].replace('</div>', '</motion.div>');
  }
  if (lines[1537] && lines[1537].includes('</div>')) {
    lines[1537] = lines[1537].replace('</div>', '</motion.div>');
  }

  fs.writeFileSync('src/App.tsx', lines.join('\n'), 'utf8');
}

fixFile();
