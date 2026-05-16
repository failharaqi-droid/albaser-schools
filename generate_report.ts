import { execSync } from 'child_process';
import fs from 'fs';

let tscOutput = '';
try {
  tscOutput = execSync('npx tsc --noEmit', { stdio: 'pipe' }).toString();
} catch (e: any) {
  tscOutput = e.stdout.toString();
}

const lines = tscOutput.split('\n');
const errorsByFile: Record<string, number[]> = {};

for (const line of lines) {
  const match = line.match(/^([a-zA-Z0-9_\-\.\/]+)\((\d+),\d+\): error (TS\d+): (.*)/);
  if (match) {
    const file = match[1];
    const lineNum = parseInt(match[2], 10);
    if (!errorsByFile[file]) {
      errorsByFile[file] = [];
    }
    // Only add if not already added (to avoid duplicates)
    if (!errorsByFile[file].includes(lineNum)) {
      errorsByFile[file].push(lineNum);
    }
  }
}

let report = '';
for (const file in errorsByFile) {
  report += `\n=== ${file} ===\n`;
  try {
    const content = fs.readFileSync(file, 'utf8').split('\n');
    for (const lineNum of errorsByFile[file]) {
      report += `\nError at line ${lineNum}:\n`;
      for (let i = Math.max(0, lineNum - 4); i <= Math.min(content.length - 1, lineNum + 3); i++) {
        report += `${i + 1}: ${content[i]}\n`;
      }
    }
  } catch (err) {}
}

fs.writeFileSync('error_report.txt', report);
console.log('Report generated at error_report.txt');
