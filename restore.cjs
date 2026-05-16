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

  // Reverse the broad replace
  content = content.replace(/\n    \}\);\n/g, "\n  );\n");
  
  fs.writeFileSync(file, content, 'utf8');
}
console.log('Restored');
