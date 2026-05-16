import { build } from 'esbuild';
import fs from 'fs';

async function autoFix() {
  const files = [
    'src/components/Dashboard.tsx'
  ];

  for (let file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let maxTries = 30;
    while (maxTries-- > 0) {
      try {
        await build({
          entryPoints: [file],
          bundle: false,
          write: false,
          logLevel: 'silent',
          loader: { '.tsx': 'tsx' },
        });
        console.log(file, 'is fixed!');
        break;
      } catch (e: any) {
        if (e.errors && e.errors.length > 0) {
          const err = e.errors[0];
          console.log(`Error in ${file} at ${err.location.line}: ${err.text}`);
          
          let lines = content.split('\n');
          let lineIdx = err.location.line - 1;
          
          if (err.text.includes('Expected "}"')) {
             // Try to insert } on the previous line or current line
             lines[lineIdx] = '}' + lines[lineIdx];
             content = lines.join('\n');
             fs.writeFileSync(file, content);
          } else if (err.text.includes('Unexpected')) {
             // Maybe missing }
             lines.splice(lineIdx, 0, '}');
             content = lines.join('\n');
             fs.writeFileSync(file, content);
          } else {
             break;
          }
        } else {
          break;
        }
      }
    }
  }
}

autoFix();
