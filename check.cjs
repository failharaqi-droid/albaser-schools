const fs = require('fs');
const files = [
  'src/components/StaffManager.tsx',
  'src/components/AttendanceManager.tsx',
  'src/components/WhatsAppBotManager.tsx',
  'src/components/SetupWizard.tsx',
  'src/components/ManualLedgerManager.tsx',
  'src/components/ExpensesManager.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let lines = fs.readFileSync(file, 'utf8').split('\n');
  let openCount = 0;
  for (let i = 0; i < lines.length; i++) {
    for (let c of lines[i]) {
      if (c === '{') openCount++;
      if (c === '}') openCount--;
    }
  }
  console.log(`${file}: openCount=${openCount}`);
}
