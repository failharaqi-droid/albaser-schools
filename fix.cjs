const fs = require('fs');
const files = [
  'src/components/AttendanceManager.tsx',
  'src/components/BackgroundBot.tsx',
  'src/components/ExpensesManager.tsx',
  'src/components/IDCardManager.tsx',
  'src/components/ManualLedgerManager.tsx',
  'src/components/PaymentModal.tsx',
  'src/components/PaymentProcessor.tsx',
  'src/components/SetupWizard.tsx',
  'src/components/StaffManager.tsx',
  'src/components/UnpaidList.tsx',
  'src/components/WhatsAppBotManager.tsx'
];

for(const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Fix bare `);` on a line that follow missing brackets
  // The global breakage looks like a multi_edit replacing `});` with just `);`
  content = content.replace(/\n\s*\);\s*\n/g, "\n    });\n");
  
  // also `;\n` where it used to be `}\n};`
  // Wait, I shouldn't just replace all empty ); .
  // Let's replace only empty );
  fs.writeFileSync(file, content, 'utf8');
}
console.log('Fixed scripts V2');
