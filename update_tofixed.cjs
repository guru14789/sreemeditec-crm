const fs = require('fs');
const path = require('path');

const targetDirs = [
    '/Users/sureshkumar/Downloads/nirva/components',
];

function processFile(filePath) {
    if (!filePath.endsWith('.tsx')) return; // Only process TSX files for UI changes
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace .toFixed(2)} with .toLocaleString(...)
    let updatedContent = content.replace(/\.toFixed\(2\)\s*\}/g, ".toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}");
    
    // Replace .toFixed(2)</ with .toLocaleString(...)</
    updatedContent = updatedContent.replace(/\.toFixed\(2\)\s*<\//g, ".toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })</");

    if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function processDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else {
            processFile(fullPath);
        }
    }
}

targetDirs.forEach(dir => processDirectory(dir));

console.log('UI formatting update complete.');
