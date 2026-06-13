const fs = require('fs');

const filePath = '/Users/sureshkumar/Downloads/nirva/components/ServiceReportModule.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. DetailedServiceReport interface
const interfaceOld = `    memoNumber?: string;
    queriesRemarks?: string;
}`;
const interfaceNew = `    memoNumber?: string;
    queriesRemarks?: string;
    isRoundOff?: boolean;
    roundOff?: number;
}`;
content = content.replace(interfaceOld, interfaceNew);

// 2. Initial state
const stateOld = `        amountReceived: 0,
        memoNumber: '',`;
const stateNew = `        amountReceived: 0,
        memoNumber: '',
        isRoundOff: false,`;
content = content.replace(stateOld, stateNew);

const resetOld = `visitCharges: 0, sparesCharges: 0, amountReceived: 0, itemsUsed: [] });`;
const resetNew = `visitCharges: 0, sparesCharges: 0, amountReceived: 0, itemsUsed: [], isRoundOff: false });`;
content = content.replace(resetOld, resetNew);

// 3. handleSave (add isRoundOff/roundOff if we want to save it)
// wait, ServiceReport doesn't have isRoundOff in types.ts. We should patch types.ts too, but since Javascript object spread works, we'll just save it directly or cast as any.
// In ServiceReportModule.tsx finalData:
const finalOld = `            status: status === 'Draft' ? 'Draft' : 'Completed',
            documentType: 'ServiceReport'`;
const finalNew = `            status: status === 'Draft' ? 'Draft' : 'Completed',
            documentType: 'ServiceReport',
            isRoundOff: report.isRoundOff,
            roundOff: finTotals.roundOff
        } as any;`;
content = content.replace(finalOld, finalNew);


// 4. finTotals
const finOld = `    const finTotals = useMemo(() => {
        const sparesSum = (report.itemsUsed || []).reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const a = report.pastBalance || 0;
        const b = report.visitCharges || 0;
        const c = sparesSum || report.sparesCharges || 0;
        const d = a + b + c;
        const e = report.amountReceived || 0;
        const netBalance = d - e;
        return { sparesTotal: c, totalReceivable: d, netBalance };
    }, [report]);`;

const finNew = `    const finTotals = useMemo(() => {
        const sparesSum = (report.itemsUsed || []).reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const a = report.pastBalance || 0;
        const b = report.visitCharges || 0;
        const c = sparesSum || report.sparesCharges || 0;
        const d = a + b + c;
        const e = report.amountReceived || 0;
        let netBalanceRaw = d - e;
        let netBalance = netBalanceRaw;
        let roundOff = 0;
        if (report.isRoundOff) {
            netBalance = Math.round(netBalanceRaw);
            roundOff = Number((netBalance - netBalanceRaw).toFixed(2));
        }
        return { sparesTotal: c, totalReceivable: d, netBalance, roundOff };
    }, [report]);`;
content = content.replace(finOld, finNew);

// 5. UI Layout
const uiGridOld = `<div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                            <FormRow label="Visit Charges (₹)">`;
const uiGridNew = `<div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                            <FormRow label="Visit Charges (₹)">`;
content = content.replace(uiGridOld, uiGridNew);

const uiOld = `                                            <FormRow label="Collected Amount (₹)">
                                                <input type="number" className="w-full h-[42px] bg-white border border-emerald-300 rounded-xl px-4 py-2 text-sm font-black text-emerald-600 outline-none shadow-sm" value={report.amountReceived || ''} onChange={e => setReport({...report, amountReceived: Number(e.target.value)})} />
                                            </FormRow>
                                        </div>`;
const uiNew = `                                            <FormRow label="Collected Amount (₹)">
                                                <input type="number" className="w-full h-[42px] bg-white border border-emerald-300 rounded-xl px-4 py-2 text-sm font-black text-emerald-600 outline-none shadow-sm" value={report.amountReceived || ''} onChange={e => setReport({...report, amountReceived: Number(e.target.value)})} />
                                            </FormRow>
                                            <div className="flex flex-col gap-1.5 w-full">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 min-h-[14px]">Round Off</label>
                                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer h-[42px]" onClick={() => setReport(prev => ({ ...prev, isRoundOff: !prev.isRoundOff }))}>
                                                    <div className={\`w-8 h-4 rounded-full relative transition-all \${report.isRoundOff ? 'bg-medical-600' : 'bg-slate-300'}\`}>
                                                        <div className={\`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform \${report.isRoundOff ? 'translate-x-4' : 'translate-x-0'}\`} />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600">Auto Round</span>
                                                </div>
                                            </div>
                                        </div>`;
content = content.replace(uiOld, uiNew);

// 6. Print template
const printOld = `                            <tr className="border-b border-black"><td className="p-2 border-r border-black font-bold">Amount received (D):</td><td className="p-2 text-right font-black w-28 text-medical-600">{(data.amountReceived || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                            <tr className="border-b border-black bg-slate-100"><td className="p-2 border-r border-black font-black uppercase">Balance (Total-D):</td><td className="p-2 text-right font-black w-28 text-rose-600">{fin.netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`;

const printNew = `                            <tr className="border-b border-black"><td className="p-2 border-r border-black font-bold">Amount received (D):</td><td className="p-2 text-right font-black w-28 text-medical-600">{(data.amountReceived || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                            {data.isRoundOff && fin.roundOff !== 0 && (
                                <tr className="border-b border-black"><td className="p-2 border-r border-black font-bold">Round Off:</td><td className="p-2 text-right font-black w-28">{fin.roundOff > 0 ? '(+) ' : '(-) '}{(Math.abs(fin.roundOff)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                            )}
                            <tr className="border-b border-black bg-slate-100"><td className="p-2 border-r border-black font-black uppercase">Balance (Total-D):</td><td className="p-2 text-right font-black w-28 text-rose-600">{fin.netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`;
content = content.replace(printOld, printNew);

fs.writeFileSync(filePath, content, 'utf8');
console.log('ServiceReportModule updated with toggle roundOff.');
