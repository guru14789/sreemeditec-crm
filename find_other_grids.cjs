const fs = require('fs');
const path = require('path');

const dirPath = '/Users/sureshkumar/Downloads/nirva/components';
const files = ['QuotationModule.tsx', 'PurchaseOrderModule.tsx', 'ServiceOrderModule.tsx', 'SupplierPOModule.tsx'];

const grids = new Set();

files.forEach(file => {
    const content = fs.readFileSync(path.join(dirPath, file), 'utf8');
    const matches = content.match(/grid-cols-\[[^\]]+\]/g);
    if (matches) {
        matches.forEach(m => {
            if (m.includes('mm') && m.includes('1fr')) grids.add(m);
        });
    }
});

console.log(Array.from(grids));
