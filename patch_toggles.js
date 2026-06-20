const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('Module.tsx') || f === 'Dashboard.tsx');

let updatedFiles = 0;

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // 1. Upgrade wrappers
    content = content.replace(/className="bg-white p-1 rounded-\[28px\] border border-slate-300 shadow-sm w-fit shrink-0 flex gap-1"/g, 'className="bg-slate-100/50 p-1.5 rounded-[2.5rem] border border-slate-200/60 shadow-inner w-fit shrink-0 flex gap-1"');
    content = content.replace(/className="flex bg-white p-1 rounded-2xl border border-slate-300 w-fit shrink-0 shadow-sm"/g, 'className="bg-slate-100/50 p-1.5 rounded-[2.5rem] border border-slate-200/60 shadow-inner w-fit shrink-0 flex gap-1"');
    content = content.replace(/className="bg-white p-1 rounded-\[28px\] border border-slate-300 shadow-sm shrink-0 flex gap-1 overflow-x-auto no-scrollbar"/g, 'className="bg-slate-100/50 p-1.5 rounded-[2.5rem] border border-slate-200/60 shadow-inner shrink-0 flex gap-1 overflow-x-auto no-scrollbar"');

    // 2. Upgrade active state
    content = content.replace(/bg-gradient-to-br from-emerald-800 to-emerald-600 text-white shadow-\[0_20px_40px_-10px_rgba\(16,185,129,0\.4\)\]/g, 'bg-emerald-900 text-emerald-100 shadow-[0_10px_20px_-5px_rgba(6,78,59,0.5)] scale-100 ring-1 ring-emerald-800/50');
    
    // Some tabs might be using different active states, let's catch standard medical ones
    content = content.replace(/bg-medical-600 text-white shadow-\[0_20px_40px_-10px_rgba\(15,153,100,0\.4\)\]/g, 'bg-emerald-900 text-emerald-100 shadow-[0_10px_20px_-5px_rgba(6,78,59,0.5)] scale-100 ring-1 ring-emerald-800/50');

    // 3. Upgrade inactive state
    content = content.replace(/text-slate-400 hover:text-emerald-600/g, 'text-slate-400 hover:text-emerald-700 scale-95');
    content = content.replace(/text-slate-400 hover:text-medical-600/g, 'text-slate-400 hover:text-emerald-700 scale-95');

    // 4. Upgrade base button sizing to be beautifully rounded
    content = content.replace(/rounded-\[20px\]/g, 'rounded-[2rem]');
    content = content.replace(/rounded-xl/g, 'rounded-[2rem]');
    
    if (content !== original) {
        fs.writeFileSync(filePath, content);
        updatedFiles++;
        console.log(`Patched ${file}`);
    }
}

console.log(`Complete. Patched ${updatedFiles} files.`);
