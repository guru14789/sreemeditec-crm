const fs = require('fs');
const path = require('path');

const filePath = '/Users/sureshkumar/Downloads/nirva/components/BillingModule.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldGrid = 'grid-cols-[8mm_1fr_15mm_12mm_15mm_22mm_10mm_8mm_24mm]';
const newGrid = 'grid-cols-[8mm_1fr_15mm_12mm_18mm_26mm_10mm_8mm_28mm]'; 

if (content.includes(oldGrid)) {
    content = content.split(oldGrid).join(newGrid);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated grid in: BillingModule.tsx`);
} else {
    console.log('Old grid not found');
}
