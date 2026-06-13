const fs = require('fs');
const path = require('path');

const targetDirs = [
    '/Users/sureshkumar/Downloads/nirva/components',
    '/Users/sureshkumar/Downloads/nirva/services',
];

const targetFiles = [
    '/Users/sureshkumar/Downloads/nirva/types.ts',
    '/Users/sureshkumar/Downloads/nirva/App.tsx'
];

function processFile(filePath) {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace .toLocaleString() with .toLocaleString('en-IN')
    // We use a global regex that matches .toLocaleString() exactly
    const updatedContent = content.replace(/\.toLocaleString\(\)/g, ".toLocaleString('en-IN')");
    
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
targetFiles.forEach(file => {
    if (fs.existsSync(file)) {
        processFile(file);
    }
});

console.log('Currency formatting update complete.');
