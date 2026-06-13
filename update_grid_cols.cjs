const fs = require('fs');
const path = require('path');

const dirPath = '/Users/sureshkumar/Downloads/nirva/components';
const files = fs.readdirSync(dirPath);

files.forEach(file => {
    if (file.endsWith('.tsx')) {
        const filePath = path.join(dirPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        const oldGrid = 'grid-cols-[8mm_1fr_15mm_12mm_20mm_15mm_10mm_8mm_18mm]';
        const newGrid = 'grid-cols-[8mm_1fr_15mm_12mm_15mm_22mm_10mm_8mm_24mm]'; // increased amount to 24mm to be safe
        
        if (content.includes(oldGrid)) {
            const updatedContent = content.split(oldGrid).join(newGrid);
            fs.writeFileSync(filePath, updatedContent, 'utf8');
            console.log(`Updated grid in: ${file}`);
        }
    }
});
