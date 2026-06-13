const fs = require('fs');
const path = require('path');

const filePath = '/Users/sureshkumar/Downloads/nirva/components/SupplierPOModule.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update calculateDetailedTotals
const calcOld = `    const grandTotal = totalWithGst + freight + freightGst - discount;
    return { subTotal, taxTotal, totalWithGst, discount, freight, freightGst, grandTotal };`;

const calcNew = `    const grandTotalRaw = totalWithGst + freight + freightGst - discount;
    const grandTotal = Math.round(grandTotalRaw);
    const roundOff = Number((grandTotal - grandTotalRaw).toFixed(2));
    return { subTotal, taxTotal, totalWithGst, discount, freight, freightGst, grandTotal, roundOff };`;

content = content.replace(calcOld, calcNew);

// 2. Update finalData
const finalOld = `            grandTotal: totals.grandTotal,
            status: status === 'Draft' ? 'Draft' : 'Pending',`;

const finalNew = `            grandTotal: totals.grandTotal,
            roundOff: totals.roundOff,
            status: status === 'Draft' ? 'Draft' : 'Pending',`;

content = content.replace(finalOld, finalNew);

// 3. Update the Print Layout Table
const tableOld = `                        <tr className="border-t border-black font-black bg-slate-50 text-sm">
                            <td colSpan={7} className="border-r border-black p-1.5 text-right uppercase">Grand Total</td>
                            <td className="p-1.5 text-right font-black">Rs. {(totals.grandTotal || 0).toLocaleString('en-IN')}</td>
                        </tr>`;

const tableNew = `                        <tr className="border-t border-black font-bold">
                            <td colSpan={7} className="border-r border-black p-1 text-right">Round Off</td>
                            <td className="p-1 text-right">{totals.roundOff > 0 ? '(+) ' : '(-) '}{(Math.abs(totals.roundOff) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr className="border-t border-black font-black bg-slate-50 text-sm">
                            <td colSpan={7} className="border-r border-black p-1.5 text-right uppercase">Grand Total</td>
                            <td className="p-1.5 text-right font-black">Rs. {(totals.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>`;

content = content.replace(tableOld, tableNew);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SupplierPOModule updated with roundOff logic.');
