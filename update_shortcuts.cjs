const fs = require('fs');

const filePath = '/Users/sureshkumar/Downloads/nirva/components/AccountingModule.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldShortcuts = `      // ─── VOUCHER SHORTCUTS (open voucher from any screen) ───
      if (e.key === 'F4' && !showVf) { e.preventDefault(); resetVf('Contra'); return; }
      if (e.key === 'F5' && !showVf) { e.preventDefault(); resetVf('Payment'); return; }
      if (e.key === 'F6' && !showVf) { e.preventDefault(); resetVf('Receipt'); return; }
      if (e.key === 'F7' && !showVf) { e.preventDefault(); resetVf('Journal'); return; }
      if (e.key === 'F8' && !showVf) { e.preventDefault(); resetVf('Sales'); return; }
      if (e.key === 'F9' && !showVf) { e.preventDefault(); resetVf('Purchase'); return; }
      if (e.ctrlKey && e.key === 'F8' && !showVf) { e.preventDefault(); resetVf('Credit Note'); return; }
      if (e.ctrlKey && e.key === 'F9' && !showVf) { e.preventDefault(); resetVf('Debit Note'); return; }`;

const newShortcuts = `      // ─── VOUCHER SHORTCUTS (open voucher from any screen) ───
      if (e.key === 'F4') { e.preventDefault(); resetVf('Contra'); return; }
      if (e.key === 'F5') { e.preventDefault(); resetVf('Payment'); return; }
      if (e.key === 'F6') { e.preventDefault(); resetVf('Receipt'); return; }
      if (e.key === 'F7') { e.preventDefault(); resetVf('Journal'); return; }
      if (e.key === 'F8' && !e.ctrlKey) { e.preventDefault(); resetVf('Sales'); return; }
      if (e.key === 'F9' && !e.ctrlKey) { e.preventDefault(); resetVf('Purchase'); return; }
      if (e.ctrlKey && e.key === 'F8') { e.preventDefault(); resetVf('Credit Note'); return; }
      if (e.ctrlKey && e.key === 'F9') { e.preventDefault(); resetVf('Debit Note'); return; }`;

content = content.replace(oldShortcuts, newShortcuts);

fs.writeFileSync(filePath, content, 'utf8');
console.log('AccountingModule shortcuts updated.');
