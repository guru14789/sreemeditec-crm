const fs = require('fs');

const filePath = '/Users/sureshkumar/Downloads/nirva/components/AccountingModule.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const targetString = `      // ─── VOUCHER-FORM-SPECIFIC SHORTCUTS ───
      if (showVf) {`;

const insertion = `      // ─── VOUCHER-FORM-SPECIFIC SHORTCUTS ───
      if (showVf) {
        // Tab / Enter navigation
        if ((e.key === 'Enter' || e.key === 'Tab') && !e.ctrlKey && !e.altKey) {
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.tagName === 'TEXTAREA')) {
                if (e.key === 'Enter') {
                    e.preventDefault(); // prevent form submit or default enter
                    const focusables = Array.from(document.querySelectorAll('input, select, textarea, button'));
                    const index = focusables.indexOf(active);
                    if (index > -1) {
                        const next = focusables[index + (e.shiftKey ? -1 : 1)];
                        if (next) (next as HTMLElement).focus();
                    }
                    return;
                }
            }
        }
`;

content = content.replace(targetString, insertion);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Enter/Tab navigation added');
