const fs = require('fs');
const path = require('path');

const filePath = '/Users/sureshkumar/Downloads/nirva/services/PDFService.ts';

let content = fs.readFileSync(filePath, 'utf8');

// Replace all .toFixed(2) with .toLocaleString
let updatedContent = content.replace(/\.toFixed\(2\)/g, ".toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })");

// Restore the roundOff calculation which must use toFixed
updatedContent = updatedContent.replace(
    /roundOff = Number\(\(grandTotal - grandTotalRaw\)\.toLocaleString\('en-IN', \{ minimumFractionDigits: 2, maximumFractionDigits: 2 \}\)\);/g,
    "roundOff = Number((grandTotal - grandTotalRaw).toFixed(2));"
);

if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`Updated PDFService.ts`);
} else {
    console.log('No changes made');
}
