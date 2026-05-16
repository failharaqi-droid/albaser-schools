import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Strip comments and strings roughly
content = content.replace(/\/\/.*$/gm, '');
content = content.replace(/\/\*[\s\S]*?\*\//g, '');
// Ignore JSX <... > stuff, it's too hard to strip reliably with regex
// Let's just use a simple stack

let lines = content.split('\n');
let stack: number[] = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  for (let j = 0; j < line.length; j++) {
    if (line[j] === '{') {
      // rough heuristic: ignore if inside a string
      stack.push(i + 1);
    } else if (line[j] === '}') {
      stack.pop();
    }
  }
}

console.log("Unclosed { found at lines:");
console.log(stack);
