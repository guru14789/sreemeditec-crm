const fs = require('fs');
const path = require('path');

const filePath = '/Users/sureshkumar/Downloads/nirva/components/SupplierPOModule.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. calculateDetailedTotals
const calcOld = `    const grandTotalRaw = totalWithGst + freight + freightGst - discount;
    const grandTotal = Math.round(grandTotalRaw);
    const roundOff = Number((grandTotal - grandTotalRaw).toFixed(2));
    return { subTotal, taxTotal, totalWithGst, discount, freight, freightGst, grandTotal, roundOff };`;

const calcNew = `    const grandTotalRaw = totalWithGst + freight + freightGst - discount;
    let grandTotal = grandTotalRaw;
    let roundOff = 0;
    if (order.isRoundOff) {
        grandTotal = Math.round(grandTotalRaw);
        roundOff = Number((grandTotal - grandTotalRaw).toFixed(2));
    }
    return { subTotal, taxTotal, totalWithGst, discount, freight, freightGst, grandTotal, roundOff };`;

content = content.replace(calcOld, calcNew);

// 2. Initial state
const stateOld = `        discount: 0,
        freightAmount: 0,`;
const stateNew = `        isRoundOff: false,
        discount: 0,
        freightAmount: 0,`;
content = content.replace(stateOld, stateNew);

const resetOld = `discount: 0, deliveryTime: 'Immediate',`;
const resetNew = `isRoundOff: false, discount: 0, deliveryTime: 'Immediate',`;
content = content.replace(resetOld, resetNew);

// 3. handleSave
const finalOld = `            grandTotal: totals.grandTotal,
            roundOff: totals.roundOff,
            status: status === 'Draft' ? 'Draft' : 'Pending',`;
const finalNew = `            grandTotal: totals.grandTotal,
            roundOff: totals.roundOff,
            isRoundOff: order.isRoundOff,
            status: status === 'Draft' ? 'Draft' : 'Pending',`;
content = content.replace(finalOld, finalNew);

// 4. UI Grid addition
const uiGridOld = `<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormRow label="Discount (₹)">`;
const uiGridNew = `<div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                            <FormRow label="Discount (₹)">`;
content = content.replace(uiGridOld, uiGridNew);

const uiOld = `                                            <FormRow label="Freight GST %">
                                                <input type="number" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-black outline-none text-teal-600" value={order.freightTaxRate || ''} onChange={e => setOrder({...order, freightTaxRate: Number(e.target.value)})} placeholder="18" />
                                            </FormRow>
                                        </div>`;
const uiNew = `                                            <FormRow label="Freight GST %">
                                                <input type="number" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-black outline-none text-teal-600" value={order.freightTaxRate || ''} onChange={e => setOrder({...order, freightTaxRate: Number(e.target.value)})} placeholder="18" />
                                            </FormRow>
                                            <div className="flex flex-col gap-1.5 w-full">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 min-h-[14px]">Round Off</label>
                                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer h-[42px]" onClick={() => setOrder(prev => ({ ...prev, isRoundOff: !prev.isRoundOff }))}>
                                                    <div className={\`w-8 h-4 rounded-full relative transition-all \${order.isRoundOff ? 'bg-medical-600' : 'bg-slate-300'}\`}>
                                                        <div className={\`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform \${order.isRoundOff ? 'translate-x-4' : 'translate-x-0'}\`} />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600">Auto Round</span>
                                                </div>
                                            </div>
                                        </div>`;
content = content.replace(uiOld, uiNew);

// 5. Print Layout Conditional
const printOld = `                        <tr className="border-t border-black font-bold">
                            <td colSpan={7} className="border-r border-black p-1 text-right">Round Off</td>
                            <td className="p-1 text-right">{totals.roundOff > 0 ? '(+) ' : '(-) '}{(Math.abs(totals.roundOff) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>`;
const printNew = `                        {data.isRoundOff && totals.roundOff !== 0 && (
                            <tr className="border-t border-black font-bold">
                                <td colSpan={7} className="border-r border-black p-1 text-right">Round Off</td>
                                <td className="p-1 text-right">{totals.roundOff > 0 ? '(+) ' : '(-) '}{(Math.abs(totals.roundOff) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        )}`;
content = content.replace(printOld, printNew);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SupplierPOModule updated with toggle roundOff.');
