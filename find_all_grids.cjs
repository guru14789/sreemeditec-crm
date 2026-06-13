const fs = require('fs');
const path = require('path');

const dirPath = '/Users/sureshkumar/Downloads/nirva/components';
const files = fs.readdirSync(dirPath);

const grids = new Set();

files.forEach(file => {
    if (file.endsWith('.tsx')) {
        const content = fs.readFileSync(path.join(dirPath, file), 'utf8');
        const matches = content.match(/grid-cols-\[[0-9]+mm_1fr[^\]]+\]/g);
        if (matches) {
            matches.forEach(m => grids.add(m));
        }
    }
});

console.log(Array.from(grids));
